# Shutter PREDICT

Shutter PREDICT is a decentralized application (dApp) built on **Gnosis Chain**, enabling users to **threshold-encrypt** predictions, commit them on-chain, and reveal them when a pre-specified time has passed. The encrypted predictions are safeguarded by Shutter's keyper network, ensuring privacy and integrity until the reveal time.

**Why Do People Hash/Encrypt Their Predictions?**
You might have seen people tweet out hashes instead of their actual predictions. Here’s why:

- Protecting Valuable Insights: Sometimes predictions hold valuable insights that could move markets or influence opinions if they were made public too early. Encrypting them keeps these insights safe until the right moment.
- Avoiding Unwanted Influence: In scenarios like upcoming elections or other sensitive events, keeping predictions encrypted helps avoid swaying public opinion before the actual event occurs.

Here’s a great blog post on this: https://www.sharvesh.com/p/interpol-red-notice-for-cobie 

But here’s the issue: People **aren’t committed to this prediction**. If in the future, it turns out they’re wrong, they’ll just not reveal the secret. What if there were a way to enforce decryption and reveal? The answer is quite simple: you don’t just post the hash, you post the actual encrypted message and you use threshold-encryption powered time-lock to enforce the decryption in a decentralized manner. That’s Shutter Predict.



## **Features**

- **Threshold Encryption**: Encrypt predictions using Shutter's encryption mechanism.
- **On-chain Commitment**: Commit encrypted predictions to a smart contract on Gnosis Chain.
- **Automated Decryption**: The Shutter keyper network generates a decryption key at the scheduled reveal time.
- **Prediction Explorer**: View and verify predictions in the Shutter Prediction Explorer.
- **Social Sharing**: Share your predictions via a pre-filled Twitter post.


## **How It Works**

1. **Encrypt Your Prediction**: Enter your prediction and specify a future reveal time.
2. **Commit to Gnosis Chain**: Once encrypted, commit your prediction to the blockchain.
3. **Reveal After Time**: After the reveal time passes, the Shutter keyper network decrypts your prediction, making it publicly accessible.



## **Technology Stack**

- **Frontend**: HTML, CSS, JavaScript
- **Blockchain**: Gnosis Chain (smart contracts)
- **Libraries**:
  - [ethers.js](https://docs.ethers.org/) for blockchain interactions
  - [axios](https://axios-http.com/) for API requests
  - Custom Shutter encryption/decryption functions



## **Getting Started**

### **Prerequisites**

1. Install [MetaMask](https://metamask.io/) or another Ethereum-compatible wallet.
2. Ensure you have access to the **Gnosis Chain** network and xDAI for transactions.



### **Running the App**

1. Clone the repository.
   ```bash
   git clone https://github.com/shutter-network/ShutterPredict.git
   ```
   
2. Open the `index.html` file in your web browser.

3. Connect your wallet by clicking the **Connect Wallet** button.

4. Complete the 3-step process:
   - **Step 1: Encrypt** – Enter your prediction and encrypt it.
   - **Step 2: Commit** – Submit the encrypted prediction on-chain.
   - **Step 3: Decrypt** – Retrieve and decrypt the prediction after the reveal time.



## **Usage**

### **Prediction Explorer**
View past predictions using the built-in [Shutter PREDICT Explorer](./explorer.html). The explorer lists prediction details including ciphertext, plaintext (if revealed), reveal time, and status.

### **Sharing Predictions**
After committing a prediction, you can share a pre-filled tweet with:
- The reveal time
- The first 10 characters of the ciphertext
- A link to view your prediction in the explorer



## **Network Configuration**

If your wallet is not connected to **Gnosis Chain**, the app will prompt you to add the network with the following parameters:

```json
{
  "chainId": "0x64",
  "chainName": "Gnosis Chain",
  "nativeCurrency": {
    "name": "xDAI",
    "symbol": "xDAI",
    "decimals": 18
  },
  "rpcUrls": ["https://rpc.gnosischain.com"],
  "blockExplorerUrls": ["https://gnosisscan.io"]
}
```



## **Smart Contract Details**

- **Contract Address**: `0xd4194b8D3cB3CE825690a9Fb167a9e6E145a9d58`
- **Main Functions**:
  - `commitPrediction(bytes _encryptedData, uint256 _revealTime, string _shutterIdentity)`
  - `revealPrediction(uint256 _id, string _plaintext)`

### **Compiling**

```
solc \
    --output-dir=./solc_out/ \
    --base-path=./contracts \
    --include-path=lib \
    --combined-json=abi,bin,bin-runtime \
    contracts/PredictionContract.sol
```

## **Development**

### **Structure**

- **index.html**: Main prediction dApp interface
- **explorer.html**: Prediction Explorer page
- **app.js**: Core logic for wallet connection, encryption, and transaction handling
- **explorer.js**: Logic to display and manage predictions on the explorer page



## **Contributing**

Feel free to submit issues and pull requests to improve the app. Contributions are welcome!

