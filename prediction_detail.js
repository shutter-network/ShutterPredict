import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

// Contract details (same as before)
const CONTRACT_ADDRESS = "0xdD7f499fae19DC9Ec100Fc4df98e566313f384b2";
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
				"name": "revealer",
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
]
const provider = new ethers.providers.JsonRpcProvider("https://rpc.gnosischain.com");
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

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

loadDetail();
