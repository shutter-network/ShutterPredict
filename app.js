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

const CONTRACT_ADDRESS = "0x922afA8BE7f60bfD331B4854A594f2402424D02a";
const CONTRACT_ABI = [
    "function commitPrediction(bytes _encryptedData, uint256 _revealTime) external",
    "function revealPrediction(uint256 _id, string _plaintext) external",
    "function predictionCount() view returns (uint256)",
    "function predictions(uint256) view returns (address, bytes, uint256, string, bool)"
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

        setStatus("Committing encrypted prediction on-chain...");
        const tx = await contract.commitPrediction(ciphertextHex, decryptionTimestamp);
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

        // Retrieve prediction ID
        const predictionId = Number(document.getElementById("predictionId").value);
        setStatus("Retrieving on-chain prediction data...");

        // Fetch the prediction data
        const predictionData = await contract.predictions(predictionId);
        console.log("Prediction Data:", predictionData);

        const predictor = predictionData[0];
        const encryptedCommitment = predictionData[1];
        const revealTime = predictionData[2];
        const revealedText = predictionData[3];
        const isRevealed = predictionData[4];

        // Check if prediction exists
        if (!predictor || predictor === ethers.constants.AddressZero) {
            setStatus("Prediction does not exist.");
            return;
        }

        // Check if prediction has already been revealed
        if (isRevealed) {
            setStatus(`Prediction already revealed: "${revealedText}"`);
            document.getElementById("decryptedOutput").textContent = revealedText;
            return;
        }

        // Check for valid encrypted data
        if (!encryptedCommitment || encryptedCommitment === "0x") {
            setStatus("Encrypted data not found.");
            return;
        }

        setStatus("Fetching Shutter final decryption key...");
        const keyResp = await axios.get(`${SHUTTER_API_BASE}/get_decryption_key`, {
            params: {
                identity: shutterIdentity.message.identity,
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

        // Send the reveal transaction
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




// ======================
// Utility: Prefill Prediction ID
// ======================
async function prefillPredictionId() {
    try {
        const predictionIdInput = document.getElementById("predictionId");
        const predictionIdOutput = document.getElementById("predictionIdOutput");

        const count = await contract.predictionCount();
        const latestId = count > 0 ? count - 1 : 0;

        predictionIdInput.value = latestId;
        predictionIdOutput.textContent = latestId;
    } catch (err) {
        console.error("Error fetching prediction ID:", err);
        setStatus("Error retrieving prediction ID");
    }
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
