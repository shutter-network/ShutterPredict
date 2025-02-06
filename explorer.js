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
// Global Variables
// ======================
let provider = null;
let contract = null;
const tableBody = document.getElementById("predictions-table").getElementsByTagName("tbody")[0];

// ======================
// Load Predictions
// ======================
async function loadPredictions() {
    tableBody.innerHTML = "";
    try {
        const countBN = await contract.predictionCount();
        const total = countBN.toNumber();
        const latest = 10;
        const start = total > latest ? total - latest : 0;

        for (let i = total - 1; i >= start; i--) {
            const prediction = await contract.predictions(i);
            const id = i;
            const ciphertext = prediction[1];
            // Shorten the ciphertext preview to 20 characters
            const shortCiphertext = ciphertext.length > 20 ? ciphertext.substring(0, 20) + "..." : ciphertext;
            const revealTime = prediction[2].toNumber();
            const revealedText = prediction[3];
            const isRevealed = prediction[4];

            const status = isRevealed ? "Revealed" : "Pending";
            const plaintext = isRevealed ? revealedText : "Not revealed";
            const revealDate = new Date(revealTime * 1000).toLocaleString();

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${id}</td>
                <td>${shortCiphertext}</td>
                <td>${plaintext}</td>
                <td>${revealDate}</td>
                <td>${status}</td>
                <td><button class="details-btn" onclick="window.location.href='prediction_detail.html?id=${id}'">Details</button></td>
            `;
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error("Error loading predictions:", error);
        tableBody.innerHTML = "<tr><td colspan='6'>Error loading predictions</td></tr>";
    }
}

// ======================
// Initialization
// ======================
document.getElementById("refresh-btn").addEventListener("click", loadPredictions);

(async function initialize() {
    await loadConfig();

    // Use the RPC URL from config
    provider = new ethers.providers.JsonRpcProvider(config.rpc_url);

    // Create the contract instance
    contract = new ethers.Contract(config.contract_address, contractABI, provider);

    // Load predictions
    loadPredictions();
})();
