from web3 import Web3
import json

# Update these paths and values as needed
GANACHE_URL = 'http://localhost:8545'
CONTRACT_ADDRESS = '0xYourContractAddressHere'  # Update with your deployed contract address
ABI_PATH = 'contracts/CertificateRegistry.abi'

# Connect to Ganache
w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

# Load contract ABI
with open(ABI_PATH, 'r') as f:
    abi = json.load(f)

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)

# Get DEFAULT_ADMIN_ROLE hash
DEFAULT_ADMIN_ROLE = w3.keccak(text="DEFAULT_ADMIN_ROLE")

print(f"DEFAULT_ADMIN_ROLE hash: {DEFAULT_ADMIN_ROLE.hex()}")

# List all accounts and check if they have the admin role
for account in w3.eth.accounts:
    has_role = contract.functions.hasRole(DEFAULT_ADMIN_ROLE, account).call()
    print(f"Account {account} has DEFAULT_ADMIN_ROLE: {has_role}")

# You can also check a specific account (e.g., from student.txt)
student_address = "0x1f61c738315c8795c4a12891c3cd74e95D1E235f"
student_is_admin = contract.functions.hasRole(DEFAULT_ADMIN_ROLE, student_address).call()
print(f"Student {student_address} has DEFAULT_ADMIN_ROLE: {student_is_admin}")

# Grant DEFAULT_ADMIN_ROLE to the first account if it doesn't have it
admin_account = w3.eth.accounts[0]
if not contract.functions.hasRole(DEFAULT_ADMIN_ROLE, admin_account).call():
    print(f"Granting DEFAULT_ADMIN_ROLE to {admin_account}...")
    tx = contract.functions.grantRole(DEFAULT_ADMIN_ROLE, admin_account).transact({'from': admin_account})
    w3.eth.wait_for_transaction_receipt(tx)
    print(f"Granted DEFAULT_ADMIN_ROLE to {admin_account}")
else:
    print(f"Account {admin_account} already has DEFAULT_ADMIN_ROLE.")
