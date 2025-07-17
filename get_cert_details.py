import os
import sys
from web3 import Web3

# Add project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.api.smartcontract.contract_manager import ContractManager

def get_certificate_details(cert_hash):
    """
    Connects to the blockchain, calls the verifyCertificate function on the
    CertificateRegistry contract, and prints the certificate details.
    """
    manager = ContractManager()
    manager.refresh()
    contract = manager.get_contract()

    if contract is None:
        print(f"Contract not loaded: {manager.get_error()}")
        return

    if cert_hash.startswith('0x'):
        cert_hash_bytes = bytes.fromhex(cert_hash[2:])
    else:
        cert_hash_bytes = bytes.fromhex(cert_hash)

    try:
        cert_data = contract.functions.verifyCertificate(cert_hash_bytes).call()
        (exists, issuer, student, issuedAt, metadata, storageMode, pdfOnChain, ipfsHash, isRevoked) = cert_data

        if not exists:
            print("Certificate not found.")
            return

        print(f"Hash: {cert_hash}")
        print(f"Issuer: {issuer}")
        print(f"Recipient: {student}")
        from datetime import datetime
        print(f"Issued At: {datetime.fromtimestamp(issuedAt).strftime('%m/%d/%Y, %I:%M:%S %p')}")
        print(f"Metadata: {metadata}")
        print(f"IPFS Hash: {ipfsHash}")
        print(f"Revoked: {isRevoked}")
        print(f"Storage Mode: {'ON_CHAIN' if storageMode == 0 else 'OFF_CHAIN'}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        certificate_hash = sys.argv[1]
        get_certificate_details(certificate_hash)
    else:
        print("Please provide a certificate hash.")
        # Example usage:
        # get_certificate_details("704981608c1991f90fc9aec30dc2f92f3901df205f8e63669bd7b12f6768cdd6")

