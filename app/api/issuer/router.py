from ninja import Router, Schema
from web3 import Web3
from app.models import Certificate
import os

import app.api.auth
from app.api.authorization import JWTAuth
from app.api.smartcontract.contract_manager import ContractManager





manager = ContractManager()
manager.refresh()

router = Router(tags=["issuer"], auth=JWTAuth())

class UnsignedTx(Schema):
    to: str
    data: str
    value: int
    gas: int
    gasPrice: int
    nonce: int
    chainId: int

class IssueRequest(Schema):
    student_address: str
    certificate_hash: str
    ipfs_cid: str
    tx_hash: str

class RevokeRequest(Schema):
    certificate_hash: str

@router.post("/certificates", response=UnsignedTx)
def issue_certificate(request, data: IssueRequest):
    contract = manager.get_contract()
    if 'issuer' not in request.auth_roles:
        return 403, {"error": "Permission denied. Issuer role required."}

    issuer_address = request.user.account.address

    try:
        # Save certificate details to the database
        Certificate.objects.create(
            diploma_id=data.certificate_hash,
            student_address=data.student_address,
            issuer_address=issuer_address,
            tx_hash=data.tx_hash,
            ipfs_hash=data.ipfs_cid
        )

        # Create a text file with certificate details
        student_short_address = data.student_address[:6]
        app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

        i = 1
        while True:
            file_path = os.path.join(app_dir, f"{student_short_address}_cert_{i}.txt")
            if not os.path.exists(file_path):
                break
            i += 1

        with open(file_path, 'w') as f:
            f.write(f"student_address: {data.student_address}\n")
            f.write(f"certificate_hash: {data.certificate_hash}\n")
            f.write(f"ipfs_cid: {data.ipfs_cid}\n")
            f.write(f"tx_hash: {data.tx_hash}\n")
            f.write(f"issuer_address: {issuer_address}\n")

        tx_data = contract.functions.registerCertificate(
            Web3.to_bytes(
                hexstr=data.certificate_hash if data.certificate_hash.startswith("0x") else "0x" + data.certificate_hash),
            Web3.to_checksum_address(data.student_address),
            data.ipfs_cid
        ).build_transaction({
            'from': issuer_address,
            'nonce': Web3.eth.get_transaction_count(issuer_address),
            'gas': 2000000, # Placeholder, estimate gas properly
            'gasPrice': Web3.eth.gas_price,
            'chainId': Web3.eth.chain_id
        })

        return tx_data
    except Exception as e:
        return 500, {"error": str(e)}

@router.post("/certificates/revoke", response=UnsignedTx)
def revoke_certificate(request, data: RevokeRequest):
    contract = manager.get_contract()
    if 'issuer' not in request.auth_roles:
        return 403, {"error": "Permission denied. Issuer role required."}

    issuer_address = request.user.account.address

    tx_data = contract.functions.revokeCertificate(
        Web3.to_bytes(
            hexstr=data.certificate_hash if data.certificate_hash.startswith("0x") else "0x" + data.certificate_hash),
    ).build_transaction({
        'from': issuer_address,
        'nonce': Web3.eth.get_transaction_count(issuer_address),
        'gas': 2000000,
        'gasPrice': Web3.eth.gas_price,
        'chainId': Web3.eth.chain_id
    })

    return tx_data

@router.get("/certificates/{certificate_hash}/file")
def get_certificate_file(request, certificate_hash: str):
    contract = manager.get_contract()
    try:
        cert_data = contract.functions.getCertificate(Web3.to_bytes(hexstr=certificate_hash if certificate_hash.startswith("0x") else "0x" + certificate_hash),).call()
        on_chain_student_address = cert_data[1]
        ipfs_cid_str = cert_data[4] # Assuming ipfsCid is at index 4

        # Access Control Check
        is_issuer = 'issuer' in request.auth_roles
        is_student_owner = request.user.account.address.lower() == on_chain_student_address.lower()

        if not (is_issuer or is_student_owner):
            return 403, {"error": "Permission denied."}

        # Fetch from IPFS (this is a placeholder for actual IPFS fetching logic)
        # In a real app, you would use an IPFS client to get the file.
        # For now, we'll just return the CID.
        return {"message": "File access granted", "ipfs_cid": ipfs_cid_str}

    except Exception as e:
        return 500, {"error": str(e)}
