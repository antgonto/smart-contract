from ninja import Router
from typing import List

from app.api.authorization import JWTAuth
from pydantic import BaseModel
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from app.api.smartcontract.contract_manager import ContractManager

manager = ContractManager()
manager.refresh()



router = Router(tags=["student"])  # Removed auth=JWTAuth() to make endpoints public

# --- Pydantic Schemas ---
class CertificateDetails(BaseModel):
    hash: str
    issuer: str
    student: str
    timestamp: int
    is_revoked: bool
    ipfs_hash: str

class ErrorSchema(BaseModel):
    error: str

class StudentLoginRequest(BaseModel):
    address: str

class StudentTokenResponse(BaseModel):
    access: str
    refresh: str

@router.get(
    "/certificates",
    response={200: List[CertificateDetails], 400: ErrorSchema, 500: ErrorSchema}
)
def get_my_certificates(request, student_address: str):
    contract = manager.get_contract()
    try:
        # Use the event logs to get all certificates, then filter by student_address
        events = contract.events.CertificateRegistered().get_logs(fromBlock=0)
        certificates = []
        for event in events:
            cert_hash = event.args.certHash.hex()
            issuer = getattr(event.args, 'issuer', None)
            student = getattr(event.args, 'student', None)
            ipfs_hash = getattr(event.args, 'ipfsCid', None)
            timestamp = getattr(event.args, 'issuedAt', None)
            is_revoked = False  # You may want to check for revocation events if needed
            if student and student.lower() == student_address.lower():
                certificates.append(
                    CertificateDetails(
                        hash=cert_hash,
                        issuer=issuer,
                        student=student,
                        timestamp=timestamp if timestamp is not None else 0,
                        is_revoked=is_revoked,
                        ipfs_hash=ipfs_hash or ""
                    )
                )
        return certificates
    except Exception as e:
        print(f"Error fetching certificates for {student_address}: {e}")
        return 500, {"error": "Could not retrieve certificates from the blockchain."}

@router.post(
    "/login",
    response={200: StudentTokenResponse, 400: ErrorSchema}
)
def student_login(request, data: StudentLoginRequest):
    # Here you could add signature verification if needed
    address = data.address
    # Optionally, check if the address exists in your system
    try:
        refresh = RefreshToken.for_user(None)  # No user object, so we use custom payload
        # Add custom claims
        refresh["address"] = address
        access = refresh.access_token
        access["address"] = address
        return 200, StudentTokenResponse(access=str(access), refresh=str(refresh))
    except Exception as e:
        return 400, {"error": f"Login failed: {str(e)}"}
