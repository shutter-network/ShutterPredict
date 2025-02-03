import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

// Contract info (same as in your main DApp)
const CONTRACT_ADDRESS = "0xd4194b8D3cB3CE825690a9Fb167a9e6E145a9d58";
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "bytes", "name": "_encryptedData", "type": "bytes" },
      { "internalType": "uint256", "name": "_revealTime", "type": "uint256" },
      { "internalType": "string", "name": "_shutterIdentity", "type": "string" }
    ],
    "name": "commitPrediction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "predictor", "type": "address" },
      { "indexed": false, "internalType": "bytes", "name": "encryptedData", "type": "bytes" },
      { "indexed": false, "internalType": "uint256", "name": "revealTime", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "shutterIdentity", "type": "string" }
    ],
    "name": "PredictionCommitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "predictor", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "revealedText", "type": "string" }
    ],
    "name": "PredictionRevealed",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" },
      { "internalType": "string", "name": "_plaintext", "type": "string" }
    ],
    "name": "revealPrediction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" }
    ],
    "name": "getPrediction",
    "outputs": [
      { "internalType": "address", "name": "predictor", "type": "address" },
      { "internalType": "bytes", "name": "encryptedData", "type": "bytes" },
      { "internalType": "uint256", "name": "revealTime", "type": "uint256" },
      { "internalType": "string", "name": "revealedText", "type": "string" },
      { "internalType": "bool", "name": "revealedFlag", "type": "bool" },
      { "internalType": "string", "name": "shutterIdentity", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "predictionCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "predictions",
    "outputs": [
      { "internalType": "address", "name": "predictor", "type": "address" },
      { "internalType": "bytes", "name": "encryptedCommitment", "type": "bytes" },
      { "internalType": "uint256", "name": "revealTime", "type": "uint256" },
      { "internalType": "string", "name": "revealed", "type": "string" },
      { "internalType": "bool", "name": "isRevealed", "type": "bool" },
      { "internalType": "string", "name": "shutterIdentity", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Use a public RPC provider for the Gnosis chain
const provider = new ethers.providers.JsonRpcProvider("https://rpc.gnosischain.com");

// Create the contract instance (read-only)
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const tableBody = document.getElementById("predictions-table").getElementsByTagName("tbody")[0];

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

document.getElementById("refresh-btn").addEventListener("click", loadPredictions);
loadPredictions();
