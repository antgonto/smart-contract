# import subprocess
# import os
# from django.conf import settings
# from app.api.smartcontract.contract_manager import ContractManager
# import traceback
#
# # --- Compile and deploy the contract on startup using solc and web3.py ---
# CONTRACTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../contracts'))
# CONTRACT_NAME = 'CertificateRegistry'
# SOL_FILE = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.sol')
# ABI_FILE = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.abi')
# BIN_FILE = os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.bin')
#
# def compile_contract():
#     try:
#         subprocess.run([
#             'solc', '--bin', '--abi', '--overwrite', '-o', CONTRACTS_DIR, SOL_FILE,
#             '--base-path', CONTRACTS_DIR
#         ], check=True)
#     except Exception as e:
#         import logging
#         logging.error(f"Failed to compile contract: {e}")
#         raise
#
# def deploy_contract():
#     from app.api.smartcontract import SEEDWeb3
#     from web3 import Web3
#     try:
#         abi_file = ABI_FILE
#         bin_file = BIN_FILE
#         with open(abi_file, 'r') as f:
#             abi_content = f.read()
#         with open(bin_file, 'r') as f:
#             bytecode = f.read()
#         import json
#         try:
#             abi = json.loads(abi_content)
#         except Exception:
#             import ast
#             abi = ast.literal_eval(abi_content)
#         provider_uri = 'http://ganache:8545'
#         # Force use of ganache:8545 for Docker
#         provider_uri = provider_uri.replace('localhost', 'ganache').replace('127.0.0.1', 'ganache')
#         w3 = Web3(Web3.HTTPProvider(provider_uri))
#         acct = w3.eth.accounts[0]
#         contract = w3.eth.contract(abi=abi, bytecode=bytecode)
#         tx_hash = contract.constructor().transact({'from': acct})
#         tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
#         contract_address = tx_receipt.contractAddress
#         with open(os.path.join(CONTRACTS_DIR, f'{CONTRACT_NAME}.txt'), 'w') as f:
#             f.write(contract_address)
#         return contract_address
#     except Exception as e:
#         import logging
#         logging.error(f"Failed to deploy contract: {e}\n{traceback.format_exc()}")
#         raise
#
# try:
#     compile_contract()
#     deploy_contract()
# except Exception as e:
#     import logging
#     logging.error(f"Startup contract compile/deploy failed: {e}")
#
# # --- Load the contract in ContractManager ---
# manager = ContractManager()
# try:
#     provider_uri = 'http://ganache:8545'
#     provider_uri = provider_uri.replace('localhost', 'ganache').replace('127.0.0.1', 'ganache')
#     manager.connect_web3(provider_uri)
#     manager.load_abi()
#     manager.load_address()
#     manager.update_contract()
# except Exception as e:
#     import logging
#     logging.error(f"Failed to load smart contract on startup: {e}")
