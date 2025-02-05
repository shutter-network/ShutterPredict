import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";
import axios from "https://cdn.skypack.dev/axios";
import { Buffer } from "https://esm.sh/buffer";

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
  
      // If the current network is not Gnosis Chain, prompt to switch/add it
      if (network.chainId !== 100) {
        const gnosisChainParams = {
          chainId: '0x64', // Gnosis Chain ID in hexadecimal
          chainName: 'Gnosis Chain',
          nativeCurrency: {
            name: 'XDAI',
            symbol: 'XDAI',
            decimals: 18,
          },
          rpcUrls: ['https://rpc.gnosischain.com'],
          blockExplorerUrls: ['https://gnosisscan.io'],
        };
  
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [gnosisChainParams],
          });
  
          // Re-fetch the provider and network after switching
          provider = new ethers.providers.Web3Provider(window.ethereum);
          signer = provider.getSigner();
          contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          setStatus("Wallet connected to Gnosis Chain!");
        } catch (switchError) {
          console.error("Failed to switch to Gnosis Chain:", switchError);
          setStatus("Please connect to the Gnosis Chain network.");
        }
      } else {
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setStatus("Wallet connected to Gnosis Chain!");
      }
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
// D) Encrypt Prediction
// (Registers identity, fetches encryption data, and encrypts the message)
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
  // Enforce a minimum reveal time of now+30 seconds
  const minTimestamp = Math.floor(Date.now() / 1000) + 30;
  if (chosenDecryptionTimestamp < minTimestamp) {
    chosenDecryptionTimestamp = minTimestamp;
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
    console.log("Encrypted ciphertext:", encryptedCiphertext);
    // Auto-expand Step 2 after encryption is complete.
    const commitContent = document.querySelector("#commit-section .content");
    if (commitContent) {
      commitContent.style.display = "block";
      document.querySelector("#commit-section .collapsible .arrow").textContent = "▼";
    }
  } catch (err) {
    console.error("Encryption error:", err);
    setStatus("Error during encryption");
  }
}

// ======================
// E) Commit Prediction (on-chain)
// ======================
async function commitPrediction() {
  if (!contract || !encryptionData) {
    setStatus("Ensure contract and encryption data are initialized!");
    return;
  }
  if (!encryptedCiphertext || !chosenDecryptionTimestamp) {
    setStatus("Please encrypt your prediction first!");
    return;
  }
  setStatus("Committing encrypted prediction on-chain...");
  try {
    const identity = await getShutterIdentity();
    const tx = await contract.commitPrediction(encryptedCiphertext, chosenDecryptionTimestamp, identity);
    console.log("Transaction sent:", tx);
    await tx.wait();
    console.log("Transaction confirmed!");
    setStatus("Commit successful!");
    await displayPredictionId();
    document.getElementById("decryptionTimeOutput").textContent = formatDecryptionTime(chosenDecryptionTimestamp);
    startCountdown(chosenDecryptionTimestamp);
    // Auto-expand Step 3 after commit is complete.
    const decryptContent = document.querySelector("#decrypt-section .content");
    if (decryptContent) {
      decryptContent.style.display = "block";
      document.querySelector("#decrypt-section .collapsible .arrow").textContent = "▼";
    }
  } catch (err) {
    console.error("commitPrediction error:", err);
    setStatus(`Error committing prediction: ${err.message}`);
  }
}

// ======================
// New: Tweet Prediction (opens pre-filled tweet)
// Now tweets the explorer link instead of the full ciphertext and includes only the first 10 characters.
// ======================
function tweetPrediction() {
  if (!encryptedCiphertext || !chosenDecryptionTimestamp) {
    alert("Please encrypt and commit your prediction before tweeting.");
    return;
  }
  const latestId = document.getElementById("predictionIdOutput").textContent;
  if (!latestId || latestId.trim() === "N/A") {
    alert("Prediction ID not available.");
    return;
  }
  const dateString = new Date(chosenDecryptionTimestamp * 1000).toLocaleString();
  // Use your domain or relative URL for the explorer detail page.
  const explorerLink = `https://pepae.github.io/ShutterPredict/prediction_detail.html?id=${latestId}`;
  // Get the first 10 characters of the ciphertext.
  const shortCiphertext = encryptedCiphertext.substring(0, 10);
  const tweetText = `I have committed on-chain to a prediction which is threshold encrypted until ${dateString}.\n\nHere are the first 10 characters of the ciphertext: ${shortCiphertext}\n\nHere's a link to view it: ${explorerLink}\n\nMore info: https://shutter.network`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  window.open(tweetUrl, "_blank");
}

// ======================
// F) Decrypt Prediction
// (Retrieve, decrypt, and reveal on-chain)
// ======================
async function decryptPrediction() {
  if (!contract) {
    setStatus("Contract not initialized!");
    return;
  }
  const predictionId = Number(document.getElementById("decryptionPredictionId").value);
  if (isNaN(predictionId)) {
    setStatus("Please enter a valid Prediction ID!");
    return;
  }
  setStatus("Retrieving on-chain prediction data...");
  try {
    const predictionData = await contract.predictions(predictionId);
    console.log("Prediction Data:", predictionData);
    const encryptedCommitment = predictionData[1];
    const revealTime = predictionData[2];
    const isRevealed = predictionData[4];
    const onChainShutterIdentity = predictionData[5];
    if (!encryptedCommitment || encryptedCommitment === "0x") {
      setStatus("Encrypted data not found.");
      return;
    }
    if (isRevealed) {
      setStatus(`Prediction already revealed: "${predictionData[3]}"`);
      document.getElementById("decryptedOutput").textContent = predictionData[3];
      return;
    }
    document.getElementById("decryptionTimeOutput").textContent = formatDecryptionTime(revealTime);
    startCountdown(revealTime);
    setStatus("Fetching Shutter decryption key...");
    const keyResp = await axios.get(`${SHUTTER_API_BASE}/get_decryption_key`, {
      params: { identity: onChainShutterIdentity, registry: REGISTRY_ADDRESS }
    });
    const finalDecryptionKey = keyResp.data?.message?.decryption_key;
    if (!finalDecryptionKey) {
      setStatus("Decryption key not available yet!");
      return;
    }
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
    console.error("decryptPrediction error:", err);
    setStatus(`Error decrypting prediction: ${err.message}`);
  }
}

async function getShutterIdentity() {
  return shutterIdentity ? shutterIdentity.message.identity : "0xDefaultIdentity";
}

async function shutterEncryptPrivateKey(privateKeyHex, encryptionData, sigmaHex) {
  const randomSigma = sigmaHex || "0x" + window.crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "");
  return await window.shutter.encryptData(privateKeyHex, encryptionData.identity, encryptionData.eon_key, randomSigma);
}

async function displayPredictionId() {
  try {
    const predictionIdOutput = document.getElementById("predictionIdOutput");
    const count = await contract.predictionCount();
    const latestId = count > 0 ? count - 1 : 0;
    // Display the ID and add a link to view details in the explorer.
    predictionIdOutput.innerHTML = latestId;
    const explorerLinkDiv = document.getElementById("explorerLink");
    explorerLinkDiv.innerHTML = `<a href="prediction_detail.html?id=${latestId}">View in Explorer</a>`;
    console.log("Prediction ID retrieved:", latestId);
  } catch (err) {
    console.error("Error fetching prediction ID:", err);
    setStatus("Error retrieving prediction ID");
  }
}

// ======================
// Event Listeners
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  await connectWallet();
  document.getElementById("encrypt-btn").addEventListener("click", encryptPrediction);
  document.getElementById("commit-btn").addEventListener("click", commitPrediction);
  document.getElementById("tweet-btn").addEventListener("click", tweetPrediction);
  document.getElementById("decrypt-btn").addEventListener("click", decryptPrediction);
});
