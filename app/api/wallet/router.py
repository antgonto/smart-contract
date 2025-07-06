from ninja import Router
from eth_account import Account as EthAccount
from web3 import Web3
import os

GANACHE_URL = os.getenv('GANACHE_URL', 'http://ganache:8545')
GANACHE_PRIVATE_KEY = os.getenv('GANACHE_PRIVATE_KEY')  # Optional: can use the first Ganache account
FUND_AMOUNT_ETHER = float(os.getenv('FUND_AMOUNT_ETHER', '1'))  # Default: 1 ETH

from django.conf import settings
from pydantic import BaseModel
from mnemonic import Mnemonic
from web3.middleware import geth_poa_middleware

import json
from app.models import Account, Transaction, Wallet, CustomUser
from django.db import transaction as db_transaction

router = Router(tags=["wallet"])

# Enable unaudited HD wallet features for eth_account to allow mnemonic-based account creation.
EthAccount.enable_unaudited_hdwallet_features()

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
        if hasattr(EthAccount, 'enable_unaudited_hdwallet_features'):
            EthAccount.enable_unaudited_hdwallet_features()
        if hasattr(EthAccount, 'from_mnemonic'):
            hd_path = "m/44'/60'/0'/0/0"
            acct = EthAccount.from_mnemonic(mnemonic, account_path=hd_path)
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

# Helper to get the first Ganache account and private key
GANACHE_ACCOUNTS_PATH = "/home/app/.ganache/accounts.json"
def get_ganache_funder(w3):
    # First, try to get private key from environment variable
    env_priv_key = os.environ.get('GANACHE_FUNDER_PRIVATE_KEY')
    if env_priv_key:
        accounts = w3.eth.accounts
        if accounts:
            return accounts[0], env_priv_key
    try:
        # Try to get accounts from Ganache RPC
        accounts = w3.eth.accounts
        if not accounts:
            return None, None
        # Try to load private keys from a known file (if available)
        try:
            with open(GANACHE_ACCOUNTS_PATH, 'r') as f:
                accs = json.load(f)
                for acc in accs:
                    if acc['address'].lower() == accounts[0].lower():
                        return accounts[0], acc['privateKey']
        except Exception:
            pass
        # Fallback: just return the address, no private key
        return accounts[0], None
    except Exception:
        return None, None

class WalletCreateRequest(BaseModel):
    name: str
    role: str  # 'issuer' or 'student'

class WalletCreateResponse(BaseModel):
    id: int
    name: str
    created_at: str

class WalletImportRequest(BaseModel):
    mnemonic: str

class WalletImportResponse(BaseModel):
    address: str
    private_key: str

class WalletImportPrivateKeyRequest(BaseModel):
    private_key: str

class WalletImportPrivateKeyResponse(BaseModel):
    address: str
    private_key: str

class WalletBalanceRequest(BaseModel):
    address: str
    rpc_url: str

class WalletBalanceResponse(BaseModel):
    address: str
    balance: str

class WalletAccountRequest(BaseModel):
    wallet_private_key: str
    rpc_url: str
    num_accounts: int = 1
    fund_amount_wei: int = 0
    name: str | None = None  # Add name field

class WalletAccountResponse(BaseModel):
    accounts: list[str]
    funded: bool
    tx_hashes: list[str]

class WalletListItem(BaseModel):
    id: int
    name: str
    created_at: str

class AccountListItem(BaseModel):
    id: int
    name: str
    address: str
    created_at: str
    balance: str | None = None

@router.post("/create", response=WalletCreateResponse)
def create_wallet(request, data: WalletCreateRequest):
    user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    # generate mnemonic and derive account
    generator = Mnemonic("english")
    mnemonic = generator.generate(strength=128)
    acct = EthAccount.from_mnemonic(mnemonic, account_path="m/44'/60'/0'/0/0")
    address = acct.address
    private_key = acct.key.hex()
    # create wallet record
    wallet = Wallet.objects.create(user=user, name=data.name)
    # create account record and assign role
    account = Account.objects.create(
        wallet=wallet,
        address=address,
        role=data.role,
        name=data.name,
        private_key=private_key,
        mnemonic=mnemonic,
        user=user
    )
    # store credentials in a file named after the wallet
    filename = f"{data.name}.txt"
    with open(filename, 'w') as f:
        f.write(f"address: {address}\nprivate_key: {private_key}\nmnemonic: {mnemonic}\n")
    # Fund the new wallet from Ganache
    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
    funder_address, funder_private_key = get_ganache_funder(w3)
    if not funder_private_key:
        raise Exception('Funder private key not found. Set GANACHE_FUNDER_PRIVATE_KEY or provide a valid accounts.json.')
    tx = {
        'to': address,
        'value': w3.to_wei(FUND_AMOUNT_ETHER, 'ether'),
        'gas': 21000,
        'gasPrice': w3.to_wei('1', 'gwei'),
        'nonce': w3.eth.get_transaction_count(funder_address),
    }
    funder_account = w3.eth.account.from_key(funder_private_key)
    signed_tx = funder_account.sign_transaction(tx)
    # Use the correct attribute for the raw transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    # Optionally, wait for receipt
    w3.eth.wait_for_transaction_receipt(tx_hash)
    return WalletCreateResponse(id=wallet.id, name=wallet.name, created_at=wallet.created_at.isoformat())

@router.get("/list", response=list[WalletListItem])
def list_wallets(request):
    user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    wallets = Wallet.objects.filter(user=user) if user else Wallet.objects.all()
    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
    wallet_items = []
    for w in wallets:
        # Get the associated account
        account = Account.objects.filter(wallet=w).first()
        balance = None
        if account:
            try:
                balance = w3.from_wei(w3.eth.get_balance(account.address), 'ether')
            except Exception:
                balance = None
        wallet_items.append(WalletListItem(id=w.id, name=w.name, created_at=w.created_at.isoformat(), balance=str(balance) if balance is not None else None))
    return wallet_items

@router.post("/import", response=WalletImportResponse)
def import_wallet(request, data: WalletImportRequest):
    acct = EthAccount.from_mnemonic(data.mnemonic, account_path="m/44'/60'/0'/0/0")
    return WalletImportResponse(address=acct.address, private_key=acct.key.hex())

@router.post("/import_private_key", response=WalletImportPrivateKeyResponse)
def import_wallet_private_key(request, data: WalletImportPrivateKeyRequest):
    pk = data.private_key
    if not pk.startswith('0x'):
        pk = '0x' + pk
    acct = EthAccount.from_key(pk)
    return WalletImportPrivateKeyResponse(address=acct.address, private_key=pk)

@router.post("/balance", response=WalletBalanceResponse)
def get_balance(request, data: WalletBalanceRequest):
    try:
        w3 = Web3(Web3.HTTPProvider(data.rpc_url, request_kwargs={'timeout': 30}))
        balance = w3.eth.get_balance(data.address)
        return WalletBalanceResponse(address=data.address, balance=str(balance))
    except Exception as e:
        return WalletBalanceResponse(address=data.address, balance=f"Error: {str(e)}")

@router.post("/generate_accounts", response=WalletAccountResponse)
def generate_accounts_and_fund(request, data: WalletAccountRequest):
    w3 = Web3(Web3.HTTPProvider(data.rpc_url, request_kwargs={'timeout': 30}))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)
    funder_private_key = data.wallet_private_key
    if not funder_private_key:
        _, funder_private_key = get_ganache_funder(w3)
        if not funder_private_key:
            return WalletAccountResponse(accounts=[], funded=False, tx_hashes=[])
    funder = w3.eth.account.from_key(funder_private_key)
    accounts = []
    tx_hashes = []
    funded = False
    with db_transaction.atomic():
        for idx in range(data.num_accounts):
            acct = w3.eth.account.create()
            accounts.append(acct.address)
            db_account, _ = Account.objects.get_or_create(
                address=acct.address,
                defaults={
                    'name': data.name if data.name else f'Generated Account {acct.address[:8]}',
                    'private_key': acct.key.hex(),
                    'mnemonic': None,
                }
            )
            if data.fund_amount_wei > 0:
                tx = {
                    'to': acct.address,
                    'value': data.fund_amount_wei,
                    'gas': 21000,
                    'gasPrice': w3.eth.gas_price,
                    'nonce': w3.eth.get_transaction_count(funder.address),
                    'chainId': w3.eth.chain_id
                }
                signed_tx = funder.sign_transaction(tx)
                tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                tx_hashes.append(tx_hash.hex())
                funded = True
                # Persist transaction
                Transaction.objects.create(
                    account=db_account,
                    tx_hash=tx_hash.hex(),
                    to_address=acct.address,
                    amount=data.fund_amount_wei,
                    status='pending',
                )
    return WalletAccountResponse(accounts=accounts, funded=funded, tx_hashes=tx_hashes)

@router.get("/account/list", response=list[AccountListItem])
def list_accounts(request, wallet_id: int):
    accounts = Account.objects.filter(wallet_id=wallet_id)
    # Optionally fetch balances here if needed
    return [AccountListItem(id=a.id, name=a.name, address=a.address, created_at=a.created_at.isoformat()) for a in accounts]

@router.get("/account/balance", response=str)
def get_account_balance(request, address: str, rpc_url: str = None):
    w3 = Web3(Web3.HTTPProvider(rpc_url or 'http://ganache:8545'))
    try:
        balance = w3.eth.get_balance(address)
        return str(balance)
    except Exception as e:
        return f"Error: {str(e)}"
