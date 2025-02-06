import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

// ======================
// Load Configuration
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
// Initialize Global Variables
// ======================
let provider = null;
let contract = null;

// Get the prediction ID from the URL query parameter
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function loadDetail() {
    const detailDiv = document.getElementById("prediction-detail");
    if (!id) {
        detailDiv.innerHTML = "No prediction ID provided.";
        return;
    }

    try {
        const prediction = await contract.predictions(id);
        const status = prediction[4] ? "Revealed" : "Pending";
        const revealTime = new Date(prediction[2].toNumber() * 1000).toLocaleString();

        detailDiv.innerHTML = `
            <div class="detail-field"><span class="detail-label">Prediction ID:</span> <span class="value">${id}</span></div>
            <div class="detail-field"><span class="detail-label">Predictor:</span> <span class="value">${prediction[0]}</span></div>
            <div class="detail-field"><span class="detail-label">Ciphertext:</span> <span class="value">${prediction[1]}</span></div>
            <div class="detail-field"><span class="detail-label">Plaintext:</span> <span class="value">${prediction[4] ? prediction[3] : "Not revealed"}</span></div>
            <div class="detail-field"><span class="detail-label">Reveal Time:</span> <span class="value">${revealTime}</span></div>
            <div class="detail-field"><span class="detail-label">Status:</span> <span class="value">${status}</span></div>
            <div class="detail-field"><span class="detail-label">Shutter Identity:</span> <span class="value">${prediction[5]}</span></div>
        `;
    } catch (error) {
        console.error("Error loading prediction detail:", error);
        detailDiv.innerHTML = "Error loading prediction detail.";
    }
}

// ======================
// Initialization
// ======================
(async function initialize() {
    await loadConfig();

    // Use the RPC URL from config
    provider = new ethers.providers.JsonRpcProvider(config.rpc_url);

    // Create the contract instance
    contract = new ethers.Contract(config.contract_address, contractABI, provider);

    // Load prediction detail
    loadDetail();
})();
