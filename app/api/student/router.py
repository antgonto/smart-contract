from ninja import Router
from typing import List

from app.api.authorization import JWTAuth
from pydantic import BaseModel

from app.api.smartcontract.contract_manager import ContractManager

manager = ContractManager()
manager.refresh()



router = Router(tags=["student"], auth=JWTAuth())

# --- Pydantic Schemas ---
class CertificateDetails(BaseModel):
    hash: str
    issuer: str
    student: str
    timestamp: int
    is_revoked: bool

@router.get("/certificates", response=List[CertificateDetails])
def get_my_certificates(request):
    student_address = request.user.account.address
    contract = manager.get_contract()
    try:
        certificate_hashes = contract.functions.getCertificatesByStudent(student_address).call()

        certificates = []
        for cert_hash_bytes in certificate_hashes:
            cert_hash_hex = "0x" + cert_hash_bytes.hex()
            cert_data = contract.functions.getCertificate(cert_hash_bytes).call()
            # cert_data is a tuple: (issuer, student, timestamp, isRevoked)
            issuer, student, timestamp, is_revoked = cert_data

            certificates.append(
                CertificateDetails(
                    hash=cert_hash_hex,
                    issuer=issuer,
                    student=student,
                    timestamp=timestamp,
                    is_revoked=is_revoked
                )
            )
        return certificates
    except Exception as e:
        # In a real app, you'd want to log this error.
        print(f"Error fetching certificates for {student_address}: {e}")
        return 500, {"error": "Could not retrieve certificates from the blockchain."}
