from ninja import Router
from eth_account import Account
from web3 import Web3
from django.conf import settings
from typing import Dict
import os
from pydantic import BaseModel

router = Router()

NETWORK_FUNDER_ENV_MAP = {
    'ganache': 'GANACHE_FUNDER_PRIVATE_KEY',
    'mainnet': 'MAINNET_FUNDER_PRIVATE_KEY',
    'testnet': 'TESTNET_FUNDER_PRIVATE_KEY',
    # Add more networks as needed
}

def derive_ganache_private_key_from_mnemonic():
    mnemonic = os.environ.get('GANACHE_MNEMONIC')
    if not mnemonic:
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('GANACHE_MNEMONIC'):
                        mnemonic = line.split('=', 1)[1].strip().replace('"', '').replace("'", '')
                        break
        except Exception:
            mnemonic = None
    if mnemonic:
        if hasattr(Account, 'enable_unaudited_hdwallet_features'):
            Account.enable_unaudited_hdwallet_features()
        if hasattr(Account, 'from_mnemonic'):
            hd_path = "m/44'/60'/0'/0/0"
            acct = Account.from_mnemonic(mnemonic, account_path=hd_path)
            return acct.key.hex()
    return None

# On startup, if GANACHE_FUNDER_PRIVATE_KEY is not set, derive and set it
if not os.environ.get('GANACHE_FUNDER_PRIVATE_KEY'):
    pk = derive_ganache_private_key_from_mnemonic()
    if pk:
        os.environ['GANACHE_FUNDER_PRIVATE_KEY'] = pk

def get_funder_private_key(network: str):
    env_var = NETWORK_FUNDER_ENV_MAP.get(network)
    if env_var:
        pk = os.environ.get(env_var)
        if pk:
            return pk
    return None

class WalletCreateRequest(BaseModel):
    network: str

@router.post("/create", response={200: Dict[str, str], 400: Dict[str, str], 500: Dict[str, str]})
def create_wallet(request, data: WalletCreateRequest):
    network = data.network
    funder_pk = get_funder_private_key(network)
    if not funder_pk:
        return 500, {"error": f"Funder private key for network '{network}' not found in environment or .env mnemonic."}
    wallet = Account.create()
    # Persist the address and private key in a txt file (for development/testing only!)
    with open("wallet_addresses.txt", "a") as f:
        f.write(f"{wallet.address},{wallet.key.hex()}\n")
    # Create a Web3 instance for this request
    w3 = Web3(Web3.HTTPProvider(getattr(settings, 'WEB3_PROVIDER', 'http://ganache:8545')))
    try:
        funder = w3.eth.account.from_key(funder_pk)
        tx = {
            'nonce': w3.eth.get_transaction_count(funder.address),
            'to': wallet.address,
            'value': w3.to_wei(10, 'ether'),  # Amount to fund
            'gas': 21000,
            'gasPrice': w3.to_wei('50', 'gwei'),
        }
        signed_tx = funder.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return {"address": wallet.address, "fund_tx_hash": tx_hash.hex()}
    except Exception as e:
        return 500, {"error": f"Wallet created but funding failed: {str(e)}", "address": wallet.address}

@router.get("/balance/{address}", response={200: Dict[str, str], 400: Dict[str, str]})
def get_balance(request, address: str):
    w3 = Web3(Web3.HTTPProvider(getattr(settings, 'WEB3_PROVIDER', 'http://ganache:8545')))
    try:
        checksum_address = w3.to_checksum_address(address)
    except Exception:
        return 400, {"error": "Invalid address format"}
    balance = w3.eth.get_balance(checksum_address)
    eth_balance = w3.from_wei(balance, 'ether')
    return {"address": address, "balance": str(eth_balance)}

# Placeholder for sending transaction (requires authentication and private key management)
@router.post("/send", response={200: Dict[str, str], 400: Dict[str, str]})
def send_transaction(request, from_address: str, to_address: str, amount: float, network: str):
    w3 = Web3(Web3.HTTPProvider(getattr(settings, 'WEB3_PROVIDER', 'http://ganache:8545')))
    try:
        checksum_from = w3.to_checksum_address(from_address)
        checksum_to = w3.to_checksum_address(to_address)
    except Exception:
        return 400, {"error": "Invalid address format"}
    funder_pk = get_funder_private_key(network)
    if not funder_pk:
        return 400, {"error": f"Funder private key for network '{network}' not found in environment or .env mnemonic."}
    try:
        nonce = w3.eth.get_transaction_count(checksum_from)
        tx = {
            'nonce': nonce,
            'to': checksum_to,
            'value': w3.to_wei(amount, 'ether'),
            'gas': 21000,
            'gasPrice': w3.to_wei('50', 'gwei'),
        }
        signed_tx = w3.eth.account.sign_transaction(tx, funder_pk)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return {"tx_hash": tx_hash.hex()}
    except Exception as e:
        return 400, {"error": str(e)}

# Ensure router is exported for Django Ninja
__all__ = ["router"]
