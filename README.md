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


# Twitter Bot Setup: Private Config & Execution

This guide details how to set up your sensitive credentials via the private configuration file and run the Twitter bot. Note that the `public_config.json` and `contract_abi.json` files are already included in the repository.

## Prerequisites

Before running the bot, ensure you have:

- **Python 3.x** installed.
- The following Python libraries:
  - `web3`
  - `requests`
  - `requests_oauthlib`
  - `eth_account`
- An Ethereum node or a public RPC endpoint (e.g., Infura) for connecting to the blockchain.
- A **Twitter Developer account** with the necessary credentials (consumer key, consumer secret, access token, access token secret, and bearer token) for posting tweets.


## Private Configuration

The bot uses a `private_config.json` file to securely store your Twitter credentials and Ethereum private key. This file is critical for authentication and should be kept secure.

### Sample private_config.json

Create (or update) the file `private_config.json` in the repository root with the following structure:

```json
{
    "private_key": "",
    "twitter_auth": {
        "access_token": "",
        "access_token_secret": "",
        "consumer_key": "",
        "consumer_secret": "",
        "bearer_token": ""
    }
}
```

### Key Points:

- **private_key:** 
  - If left empty (`""`), the bot will automatically generate a new Ethereum address and private key upon execution.
  - Once generated, the new key will be saved back to `private_config.json`.

- **twitter_auth:** 
  - Populate these fields with your Twitter Developer credentials:
    - `access_token`
    - `access_token_secret`
    - `consumer_key`
    - `consumer_secret`
    - `bearer_token` (if applicable, though the OAuth1 flow primarily uses the other keys).

> **Security Reminder:** 
> Keep `private_config.json` secure and avoid sharing it publicly since it contains sensitive information.


## Running the Bot

The bot script includes a main menu with several options. Here’s how to run it:

1. **Ensure Repository Setup:** 
   Verify that `public_config.json` and `contract_abi.json` are present in the repository as provided.

2. **Prepare the Private Config:** 
   - Edit `private_config.json` to add your Twitter credentials.
   - Leave `private_key` empty if you want the bot to generate a new Ethereum key automatically.

3. **Run the Bot Script:** 
   Open a terminal in the repository directory and execute:

   ```bash
   python decrypt_bot.py
   ```

4. **Follow the Main Menu:** 
   The script will display a menu with options like:
   - **Run Bot:** Starts the continuous monitoring, decryption, on-chain reveal, and tweeting process.
   - **Test Functions:** Options to test fetching predictions, tweeting, or decryption.
   - **Generate a New Address:** Creates a new Ethereum address if needed.

Fund the address with a small amount of xDAI so that the bot can decrypt on-chain.

   Simply enter the number corresponding to your desired action and press **Enter**.

5. **Monitor Output:** 
   The bot will print logs to the console, indicating actions like key generation, prediction processing, on-chain transactions, and tweets being posted.

### Installing the bot as a service

The bot comes with a systemd unit file that can be installed as a service.
Run

```
sed 's:ExecStart.*:ExecStart='`which uv`' run '`pwd`'/decrypt_bot.py 1\nWorkingDirectory='`pwd`':' decryptbot.service.template > /etc/systemd/user/decryptbot.service
systemctl --user enable decryptbot.service
systemctl --user start decryptbot.service
```


## **Development**

### **Structure**

- **index.html**: Main prediction dApp interface
- **explorer.html**: Prediction Explorer page
- **app.js**: Core logic for wallet connection, encryption, and transaction handling
- **explorer.js**: Logic to display and manage predictions on the explorer page



## **Contributing**

Feel free to submit issues and pull requests to improve the app. Contributions are welcome!

