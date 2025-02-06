import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";
import axios from "https://cdn.skypack.dev/axios";
import { Buffer } from "https://esm.sh/buffer";

// ======================
// Load Configuration and ABI
// ======================
let config = null;
let contractABI = null;

async function loadConfig() {
    const configResponse = await fetch("public_config.json");
    config = await configResponse.json();

    const abiResponse = await fetch("contract_abi.json");
    contractABI = await abiResponse.json();
}

// ======================
// Global Variables
// ======================
let provider = null;
let signer = null;
let contract = null;
let shutterIdentity = null;
let encryptionData = null;
let encryptedCiphertext = null;
let chosenDecryptionTimestamp = null;

// ======================
// Utility Functions
// ======================
function setStatus(msg) {
    document.getElementById("status").textContent = msg;
}

function generateRandomHex(sizeInBytes) {
    const bytes = new Uint8Array(sizeInBytes);
    window.crypto.getRandomValues(bytes);
    return "0x" + Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

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
// A) Connect Wallet (auto-called on page load)
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
            const gnosisChainParams = {
                chainId: '0x64',
                chainName: 'Gnosis Chain',
                nativeCurrency: {
                    name: 'XDAI',
                    symbol: 'XDAI',
                    decimals: 18,
                },
                rpcUrls: [config.rpc_url],
                blockExplorerUrls: ['https://gnosisscan.io'],
            };

            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [gnosisChainParams],
            });

            provider = new ethers.providers.Web3Provider(window.ethereum);
        }

        signer = provider.getSigner();
        contract = new ethers.Contract(config.contract_address, contractABI, signer);
        setStatus("Wallet connected to Gnosis Chain!");
    } catch (err) {
        console.error("connectWallet error:", err);
        setStatus("Error connecting wallet.");
    }
}

// ======================
// B) Register Shutter Identity
// ======================
async function registerIdentity(decryptionTimestamp) {
    const identityPrefix = generateRandomHex(32);
    try {
        setStatus("Registering identity on Shutter...");
        const resp = await axios.post(`${config.shutter_api_base}/register_identity`, {
            decryptionTimestamp,
            identityPrefix,
            registry: config.registry_address
        });
        shutterIdentity = resp.data;
        setStatus("Shutter identity registered successfully!");
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
        const url = `${config.shutter_api_base}/get_data_for_encryption?address=${config.registry_address}&identityPrefix=${shutterIdentity.message.identity_prefix}`;
        const resp = await axios.get(url);
        encryptionData = resp.data;
        setStatus("Got Shutter encryption data!");
    } catch (err) {
        console.error("fetchEncryptionData error:", err);
        setStatus("Error fetching encryption data.");
    }
}

// ======================
// D) Encrypt Prediction
// ======================
async function encryptPrediction() {
    const predictionText = document.getElementById("predictionText").value.trim();
    if (!predictionText) {
        setStatus("Please enter a prediction!");
        return;
    }

    const dtValue = document.getElementById("decryptionTimestamp").value;
    if (!dtValue) {
        setStatus("Please select a reveal time!");
        return;
    }

    const chosenDate = new Date(dtValue);
    chosenDecryptionTimestamp = Math.floor(chosenDate.getTime() / 1000);
    if (chosenDecryptionTimestamp < Math.floor(Date.now() / 1000) + 30) {
        chosenDecryptionTimestamp = Math.floor(Date.now() / 1000) + 30;
    }

    await registerIdentity(chosenDecryptionTimestamp);
    if (!shutterIdentity) return;
    await fetchEncryptionData();
    if (!encryptionData) return;

    setStatus("Encrypting prediction...");
    const msgHex = "0x" + Buffer.from(predictionText, "utf8").toString("hex");

    try {
        encryptedCiphertext = await shutterEncryptPrivateKey(msgHex, encryptionData.message, null);
        document.getElementById("ciphertextOutput").textContent = encryptedCiphertext;
        setStatus("Encryption complete!");
    } catch (err) {
        console.error("Encryption error:", err);
        setStatus("Error during encryption.");
    }
}

// ======================
// E) Commit Prediction
// ======================
async function commitPrediction() {
    if (!contract || !encryptionData) {
        setStatus("Ensure contract and encryption data are initialized!");
        return;
    }

    setStatus("Committing encrypted prediction on-chain...");
    try {
        const identity = await getShutterIdentity();
        const tx = await contract.commitPrediction(encryptedCiphertext, chosenDecryptionTimestamp, identity);
        await tx.wait();
        setStatus("Commit successful!");
        await displayPredictionId();
    } catch (err) {
        console.error("commitPrediction error:", err);
        setStatus("Error committing prediction.");
    }
}

// ======================
// F) Decrypt Prediction
// ======================
async function decryptPrediction() {
    const predictionId = Number(document.getElementById("decryptionPredictionId").value);
    if (isNaN(predictionId)) {
        setStatus("Please enter a valid Prediction ID!");
        return;
    }

    try {
        const predictionData = await contract.predictions(predictionId);
        const encryptedCommitment = predictionData[1];
        const revealTime = predictionData[2];
        const isRevealed = predictionData[4];

        if (isRevealed) {
            setStatus(`Prediction already revealed: "${predictionData[3]}"`);
            return;
        }

        startCountdown(revealTime);
        setStatus("Fetching Shutter decryption key...");
        const keyResp = await axios.get(`${config.shutter_api_base}/get_decryption_key`, {
            params: { identity: predictionData[5], registry: config.registry_address }
        });

        const finalDecryptionKey = keyResp.data?.message?.decryption_key;
        if (!finalDecryptionKey) {
            setStatus("Decryption key not available yet!");
            return;
        }

        const decryptedHex = await window.shutter.decrypt(encryptedCommitment, finalDecryptionKey);
        const decryptedText = Buffer.from(decryptedHex.slice(2), "hex").toString("utf8");
        setStatus(`Decryption complete! Plaintext: "${decryptedText}"`);
    } catch (err) {
        console.error("decryptPrediction error:", err);
        setStatus("Error decrypting prediction.");
    }
}

// ======================
// Event Listeners
// ======================
document.addEventListener("DOMContentLoaded", async () => {
    await loadConfig();
    await connectWallet();
    document.getElementById("encrypt-btn").addEventListener("click", encryptPrediction);
    document.getElementById("commit-btn").addEventListener("click", commitPrediction);
    document.getElementById("decrypt-btn").addEventListener("click", decryptPrediction);
});
