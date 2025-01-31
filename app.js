import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";
import axios from "https://cdn.skypack.dev/axios";
import { Buffer } from 'https://esm.sh/buffer';

// ======================
// Global Variables
// ======================
let provider = null;
let signer = null;
let contract = null;
let shutterIdentity = null;
let encryptionData = null;

const CONTRACT_ADDRESS = "0xd4194b8D3cB3CE825690a9Fb167a9e6E145a9d58";
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "_encryptedData",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "_revealTime",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_shutterIdentity",
                "type": "string"
            }
        ],
        "name": "commitPrediction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "predictor",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "encryptedData",
                "type": "bytes"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "revealTime",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "shutterIdentity",
                "type": "string"
            }
        ],
        "name": "PredictionCommitted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "predictor",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "revealedText",
                "type": "string"
            }
        ],
        "name": "PredictionRevealed",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_id",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_plaintext",
                "type": "string"
            }
        ],
        "name": "revealPrediction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_id",
                "type": "uint256"
            }
        ],
        "name": "getPrediction",
        "outputs": [
            {
                "internalType": "address",
                "name": "predictor",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "encryptedData",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "revealTime",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "revealedText",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "revealedFlag",
                "type": "bool"
            },
            {
                "internalType": "string",
                "name": "shutterIdentity",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "predictionCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "predictions",
        "outputs": [
            {
                "internalType": "address",
                "name": "predictor",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "encryptedCommitment",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "revealTime",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "revealed",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "isRevealed",
                "type": "bool"
            },
            {
                "internalType": "string",
                "name": "shutterIdentity",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];


const SHUTTER_API_BASE = "https://shutter.api.staging.shutter.network/api";
const REGISTRY_ADDRESS = "0x228DefCF37Da29475F0EE2B9E4dfAeDc3b0746bc";

// ======================
// Utility Functions
// ======================
function setStatus(msg) {
    document.getElementById("status").textContent = msg;
}

function generateRandomHex(sizeInBytes) {
    const bytes = new Uint8Array(sizeInBytes);
    window.crypto.getRandomValues(bytes);
    return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Utility to display the decryption countdown
function formatDecryptionTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

function startCountdown(decryptionTimestamp) {
    const countdownOutput = document.getElementById("countdownOutput");
    let timer;

    function updateCountdown() {
        const timeLeft = decryptionTimestamp - Math.floor(Date.now() / 1000);
        if (timeLeft > 0) {
            countdownOutput.textContent = `${timeLeft} seconds remaining`;
        } else {
            countdownOutput.textContent = "Decryption available!";
            clearInterval(timer);
        }
    }

    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
}


// ======================
// A) Connect Wallet
// ======================
async function connectWallet() {
    try {
        if (!window.ethereum) {
            alert("MetaMask not found!");
            return;
        }

        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        const network = await provider.getNetwork();
        console.log("Connected to network:", network);

        if (network.chainId !== 100) {
            alert("Please connect to the Gnosis Chain network!");
            return;
        }

        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        setStatus("Wallet connected!");
    } catch (err) {
        console.error("connectWallet error:", err);
        setStatus("Error connecting wallet");
    }
}

// ======================
// B) Register Shutter Identity
// ======================
async function registerIdentity() {
    const currentTimestamp = Math.floor(Date.now() / 1000) + 600;
    const decryptionTimestamp = Number(document.getElementById("decryptionTimestamp").value) || currentTimestamp;

    let identityPrefix = document.getElementById("identityPrefix").value;
    if (!identityPrefix || identityPrefix.length !== 66 || !identityPrefix.startsWith("0x")) {
        identityPrefix = generateRandomHex(32);
        console.log("Generated Identity Prefix:", identityPrefix);
    }

    try {
        setStatus("Registering identity on Shutter...");
        const resp = await axios.post(`${SHUTTER_API_BASE}/register_identity`, {
            decryptionTimestamp,
            identityPrefix,
            registry: REGISTRY_ADDRESS
        });
        shutterIdentity = resp.data;
        setStatus("Shutter identity registered successfully!");
        console.log("Shutter Identity:", shutterIdentity);
    } catch (err) {
        console.error("registerIdentity error:", err);
        setStatus(`Error registering identity: ${err.response?.data?.description || "An error occurred"}`);
    }
}

// ======================
// C) Fetch Encryption Data
// ======================
async function fetchEncryptionData() {
    if (!shutterIdentity?.message?.identity_prefix) {
        setStatus("Identity prefix not found. Register the identity first!");
        return;
    }

    try {
        setStatus("Fetching Shutter encryption data...");
        const url = `${SHUTTER_API_BASE}/get_data_for_encryption?address=${REGISTRY_ADDRESS}&identityPrefix=${shutterIdentity.message.identity_prefix}`;
        const resp = await axios.get(url);
        encryptionData = resp.data;
        setStatus("Got Shutter encryption data!");
        console.log("Encryption Data:", encryptionData);
    } catch (err) {
        console.error("fetchEncryptionData error:", err);
        setStatus(`Error fetching encryption data: ${err.response?.data?.description || "An error occurred"}`);
    }
}

// ======================
// D) Commit a Prediction
// ======================
async function commitPrediction() {
    try {
        if (!contract || !encryptionData) {
            setStatus("Ensure contract and encryption data are initialized!");
            console.error("Contract or encryption data not initialized");
            return;
        }

        const predictionText = document.getElementById("predictionText").value.trim();
        if (!predictionText) {
            setStatus("Please enter a prediction!");
            console.warn("Empty prediction text input");
            return;
        }

        const decryptionTimestamp = Math.floor(Date.now() / 1000) + 30;  // Example 30 seconds from now
        document.getElementById("decryptionTimeOutput").textContent = formatDecryptionTime(decryptionTimestamp);

        setStatus("Encrypting prediction...");
        const msgHex = "0x" + Buffer.from(predictionText, "utf8").toString("hex");

        const ciphertextHex = await shutterEncryptPrivateKey(
            msgHex,
            encryptionData.message,
            null
        );

        document.getElementById("ciphertextOutput").textContent = ciphertextHex;
        console.log("Encryption complete. Ciphertext:", ciphertextHex);

        // Fetch the shutter identity
        const shutterIdentity = await getShutterIdentity();

        setStatus("Committing encrypted prediction on-chain...");
        const tx = await contract.commitPrediction(ciphertextHex, decryptionTimestamp, shutterIdentity);
        console.log("Transaction sent:", tx);

        await tx.wait();
        console.log("Transaction confirmed!");
        setStatus("Commit successful!");

        await displayPredictionId();
        startCountdown(decryptionTimestamp);  // Start the countdown timer
    } catch (err) {
        console.error("commitPrediction error:", err);
        setStatus(`Error committing prediction: ${err.message}`);
    }
}

async function displayPredictionId() {
    try {
        const predictionIdOutput = document.getElementById("predictionIdOutput");
        const count = await contract.predictionCount();
        const latestId = count > 0 ? count - 1 : 0;

        // Update both the input and output fields
        document.getElementById("predictionId").value = latestId;
        predictionIdOutput.textContent = latestId;

        console.log("Prediction ID retrieved:", latestId);
    } catch (err) {
        console.error("Error fetching prediction ID:", err);
        setStatus("Error retrieving prediction ID");
    }
}



// ======================
// E) Reveal a Prediction
// ======================
async function revealPrediction() {
    try {
        if (!contract) {
            setStatus("Contract not initialized!");
            return;
        }

        const predictionId = Number(document.getElementById("predictionId").value);
        setStatus("Retrieving on-chain prediction data...");

        const predictionData = await contract.predictions(predictionId);
        console.log("Prediction Data:", predictionData);

        const encryptedCommitment = predictionData[1];
        const revealTime = predictionData[2];
        const isRevealed = predictionData[4];
        const shutterIdentity = predictionData[5];  // Retrieve Shutter identity

        // Check for valid encrypted data
        if (!encryptedCommitment || encryptedCommitment === "0x") {
            setStatus("Encrypted data not found.");
            return;
        }

        // Handle already revealed prediction
        if (isRevealed) {
            setStatus(`Prediction already revealed: "${predictionData[3]}"`);
            document.getElementById("decryptedOutput").textContent = predictionData[3];
            return;
        }

        // Display decryption time and start countdown if not expired
        document.getElementById("decryptionTimeOutput").textContent = formatDecryptionTime(revealTime);
        startCountdown(revealTime);

        // Fetch Shutter decryption key
        setStatus("Fetching Shutter decryption key...");
        const keyResp = await axios.get(`${SHUTTER_API_BASE}/get_decryption_key`, {
            params: {
                identity: shutterIdentity,
                registry: REGISTRY_ADDRESS
            }
        });

        const finalDecryptionKey = keyResp.data?.message?.decryption_key;
        if (!finalDecryptionKey) {
            setStatus("Decryption key not available yet!");
            return;
        }

        // Decrypt the ciphertext locally
        const decryptedHex = await window.shutter.decrypt(encryptedCommitment, finalDecryptionKey);
        const decryptedText = Buffer.from(decryptedHex.slice(2), "hex").toString("utf8");

        document.getElementById("decryptedOutput").textContent = decryptedText;
        setStatus("Revealing prediction on-chain...");

        const tx = await contract.revealPrediction(predictionId, decryptedText);
        console.log("Transaction sent:", tx);
        await tx.wait();
        console.log("Transaction confirmed!");

        setStatus(`Reveal complete! Plaintext: "${decryptedText}"`);
    } catch (err) {
        console.error("revealPrediction error:", err);
        setStatus(`Error revealing prediction: ${err.message}`);
    }
}

async function getShutterIdentity() {
    // Get the Shutter identity (e.g., from localStorage, if stored or generated)
    // For now, we assume it was generated or retrieved earlier in the flow
    return shutterIdentity ? shutterIdentity.message.identity : "0xDefaultIdentity";  // Use default if not set
}





// ======================
// Utility: Shutter Encryption
// ======================
async function shutterEncryptPrivateKey(privateKeyHex, encryptionData, sigmaHex) {
    const randomSigma = sigmaHex || "0x" + window.crypto
        .getRandomValues(new Uint8Array(32))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

    return await window.shutter.encryptData(
        privateKeyHex,
        encryptionData.identity,
        encryptionData.eon_key,
        randomSigma
    );
}



// ======================
// Event Listeners
// ======================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connect-wallet-btn").addEventListener("click", connectWallet);
    document.getElementById("register-identity-btn").addEventListener("click", registerIdentity);
    document.getElementById("fetch-encryption-data-btn").addEventListener("click", fetchEncryptionData);
    document.getElementById("commit-btn").addEventListener("click", commitPrediction);
    document.getElementById("reveal-btn").addEventListener("click", revealPrediction);

    setStatus("Ready. Please connect wallet.");
});
