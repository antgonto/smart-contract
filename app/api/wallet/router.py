from ninja import Router
from eth_account import Account
from web3 import Web3
from django.conf import settings
from typing import Dict

router = Router()

# Connect to local Ganache or Infura (update as needed)
w3 = Web3(Web3.HTTPProvider(getattr(settings, 'WEB3_PROVIDER', 'http://ganache:8545')))

@router.post("/create", response={200: Dict[str, str]})
def create_wallet(request):
    wallet = Account.create()
    # Persist the address and private key in a txt file (for development/testing only!)
    with open("wallet_addresses.txt", "a") as f:
        f.write(f"{wallet.address},{wallet.key.hex()}\n")
    # Never return private key in production!
    return {"address": wallet.address}

@router.get("/balance/{address}", response={200: Dict[str, str], 400: Dict[str, str]})
def get_balance(request, address: str):
    if not w3.is_address(address):
        return 400, {"error": "Invalid address"}
    balance = w3.eth.get_balance(address)
    eth_balance = w3.from_wei(balance, 'ether')
    return {"address": address, "balance": str(eth_balance)}

# Placeholder for sending transaction (requires authentication and private key management)
@router.post("/send", response={200: Dict[str, str], 400: Dict[str, str]})
def send_transaction(request, from_address: str, to_address: str, amount: float, private_key: str):
    if not w3.is_address(from_address) or not w3.is_address(to_address):
        return 400, {"error": "Invalid address"}
    try:
        nonce = w3.eth.get_transaction_count(from_address)
        tx = {
            'nonce': nonce,
            'to': to_address,
            'value': w3.to_wei(amount, 'ether'),
            'gas': 21000,
            'gasPrice': w3.to_wei('50', 'gwei'),
        }
        signed_tx = w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return {"tx_hash": tx_hash.hex()}
    except Exception as e:
        return 400, {"error": str(e)}
