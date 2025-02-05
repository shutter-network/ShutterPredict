import time
import json
import requests
from web3 import Web3
from eth_account import Account
from requests_oauthlib import OAuth1

# ======================
# Load and Update Configuration
# ======================
CONFIG_FILE = "config.json"

def load_config():
    """Load the configuration file."""
    try:
        with open(CONFIG_FILE, "r") as config_file:
            return json.load(config_file)
    except FileNotFoundError:
        print("Configuration file not found.")
        return {}

def save_config(updated_config):
    """Save the updated configuration to the config file."""
    with open(CONFIG_FILE, "w") as config_file:
        json.dump(updated_config, config_file, indent=4)
    print("Config file updated successfully.")

config = load_config()

# Generate a new address and save if private key is missing
if not config.get("private_key"):
    print("No private key found. Generating a new Ethereum address...")
    new_account = Account.create()
    new_private_key = new_account.key.hex()
    new_address = new_account.address

    config["private_key"] = new_private_key
    save_config(config)

    print(f"New Ethereum address generated and saved:\nAddress: {new_address}\nPrivate Key: {new_private_key}")

# ======================
# Initialize Constants and API Clients
# ======================
RPC_URL = config["rpc_url"]
CONTRACT_ADDRESS = config["contract_address"]
SHUTTER_API_BASE = config["shutter_api_base"]
REGISTRY_ADDRESS = config["registry_address"]
PRIVATE_KEY = config["private_key"]

# Initialize OAuth1 for Twitter API (required for write actions)
oauth = OAuth1(
    client_key=config["twitter_auth"]["consumer_key"],
    client_secret=config["twitter_auth"]["consumer_secret"],
    resource_owner_key=config["twitter_auth"]["access_token"],
    resource_owner_secret=config["twitter_auth"]["access_token_secret"]
)

TWITTER_API_URL = "https://api.twitter.com/2/tweets"

# ======================
# Initialize Web3 and Contract
# ======================
web3 = Web3(Web3.HTTPProvider(RPC_URL))
with open("contract_abi.json", "r") as file:
    CONTRACT_ABI = json.load(file)

account = web3.eth.account.from_key(PRIVATE_KEY)
contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

# ======================
# Helper Functions
# ======================

def fetch_latest_prediction():
    """Retrieve the latest prediction from the smart contract."""
    prediction_count = contract.functions.predictionCount().call()
    if prediction_count == 0:
        print("No predictions found.")
        return None
    latest_prediction_id = prediction_count - 1
    prediction = contract.functions.getPrediction(latest_prediction_id).call()
    return latest_prediction_id, prediction

def fetch_pending_predictions():
    """Retrieve predictions that are pending decryption and reveal."""
    pending_predictions = []
    prediction_count = contract.functions.predictionCount().call()

    for prediction_id in range(prediction_count):
        prediction = contract.functions.getPrediction(prediction_id).call()
        is_revealed = prediction[4]
        reveal_time = prediction[2]

        if not is_revealed and reveal_time <= int(time.time()):
            pending_predictions.append((prediction_id, prediction))

    return pending_predictions

def get_shutter_decryption_key(identity):
    """Retrieve decryption key from the Shutter API."""
    response = requests.get(f"{SHUTTER_API_BASE}/get_decryption_key", params={
        "identity": identity,
        "registry": REGISTRY_ADDRESS
    })

    if response.status_code == 200:
        return response.json().get("decryption_key")
    else:
        print("Error fetching decryption key:", response.json())
        return None

def decrypt_prediction_with_api(identity, encrypted_commitment):
    """Use the Shutter API to decrypt the commitment."""
    response = requests.get(f"{SHUTTER_API_BASE}/decrypt_commitment", params={
        "identity": identity,
        "encryptedCommitment": encrypted_commitment
    })

    if response.status_code == 200:
        decrypted_hex = response.json().get("decrypted_message")
        if decrypted_hex:
            decrypted_text = bytes.fromhex(decrypted_hex[2:]).decode("utf-8")
            return decrypted_text
    else:
        print("Error decrypting commitment:", response.json())

    return None

def reveal_prediction_on_chain(prediction_id, plaintext):
    """Submit the decrypted plaintext to the smart contract."""
    tx = contract.functions.revealPrediction(prediction_id, plaintext).buildTransaction({
        "from": account.address,
        "nonce": web3.eth.getTransactionCount(account.address),
        "gas": 300000,
        "gasPrice": web3.toWei("5", "gwei")
    })

    signed_tx = web3.eth.account.sign_transaction(tx, private_key=account.key)
    tx_hash = web3.eth.sendRawTransaction(signed_tx.rawTransaction)
    return tx_hash.hex()

def tweet_prediction(prediction_id, plaintext):
    """Post a tweet about the revealed prediction using OAuth1."""
    explorer_link = f"https://gnosisscan.io/tx/{prediction_id}"
    tweet_text = (
        f"Prediction {prediction_id} has been revealed!\n\n"
        f"Prediction: {plaintext}\n\n"
        f"View it here: {explorer_link}\n\n"
        f"#ShutterPredict #GnosisChain"
    )

    payload = {"text": tweet_text}

    try:
        response = requests.post(TWITTER_API_URL, json=payload, auth=oauth)
        if response.status_code == 201:
            tweet_id = response.json().get("data", {}).get("id")
            print(f"Tweet posted successfully: {tweet_id}")
        else:
            print("Error posting tweet:", response.text)
    except requests.RequestException as e:
        print("Twitter API error:", str(e))

# ======================
# Bot and Test Functions
# ======================

def run_bot():
    """Run the bot continuously to check and reveal predictions."""
    print("Starting Shutter PREDICT bot...")

    while True:
        try:
            predictions = fetch_pending_predictions()
            if not predictions:
                print("No pending predictions. Retrying in 10 minutes...")
                time.sleep(600)
                continue

            for prediction_id, prediction in predictions:
                print(f"Processing Prediction ID: {prediction_id}")

                encrypted_commitment = prediction[1]
                identity = prediction[5]

                decryption_key = get_shutter_decryption_key(identity)
                if not decryption_key:
                    print(f"Skipping Prediction ID {prediction_id}: Decryption key not available.")
                    continue

                decrypted_text = decrypt_prediction_with_api(identity, encrypted_commitment)
                if not decrypted_text:
                    print(f"Skipping Prediction ID {prediction_id}: Decryption failed.")
                    continue

                print(f"Decrypted Text: {decrypted_text}")

                tx_hash = reveal_prediction_on_chain(prediction_id, decrypted_text)
                print(f"Prediction {prediction_id} revealed on-chain. TX Hash: {tx_hash}")

                tweet_prediction(prediction_id, decrypted_text)
                print(f"Prediction {prediction_id} tweeted successfully.")

        except Exception as e:
            print("Error:", str(e))

        print("Waiting for the next check...")
        time.sleep(600)  # Check every 10 minutes

def test_latest_prediction():
    """Test function to fetch and print the latest prediction."""
    latest = fetch_latest_prediction()
    if not latest:
        print("No predictions available.")
        return

    prediction_id, prediction = latest
    encrypted_commitment = prediction[1]
    reveal_time = prediction[2]

    print(f"Latest Prediction ID: {prediction_id}")
    print(f"Encrypted Commitment: {encrypted_commitment}")
    print(f"Reveal Time: {reveal_time}")

def test_tweet_latest_prediction():
    """Test function to fetch the latest prediction and tweet it."""
    latest = fetch_latest_prediction()
    if not latest:
        print("No predictions available.")
        return

    prediction_id, prediction = latest
    tweet_prediction(prediction_id, "Test prediction: This is a sample prediction for testing.")

def generate_new_address():
    """Generate a new Ethereum address and save the private key to the config."""
    new_account = Account.create()
    new_private_key = new_account.key.hex()
    new_address = new_account.address

    print("Generated new address:")
    print(f"Address: {new_address}")
    print(f"Private Key: {new_private_key}")

    # Save to config
    config["private_key"] = new_private_key
    save_config(config)
    return new_address

# ======================
# Main Menu
# ======================
if __name__ == "__main__":
    print("Select an option:")
    print("1. Run bot")
    print("2. Test fetch latest prediction")
    print("3. Test tweet prediction")
    print("4. Generate a new address and save it to config")

    choice = input("Enter your choice: ").strip()

    if choice == "1":
        run_bot()
    elif choice == "2":
        test_latest_prediction()
    elif choice == "3":
        test_tweet_latest_prediction()
    elif choice == "4":
        generate_new_address()
    else:
        print("Invalid choice. Exiting.")
