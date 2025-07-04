from ninja import Router
from web3 import Web3
from django.conf import settings
from pydantic import BaseModel
import os

from django.http import JsonResponse
import requests

from django_ratelimit.decorators import ratelimit

router = Router(tags=["public"])

class RecaptchaPayload(BaseModel):
    recaptchaToken: str

# --- Pydantic Schemas ---
class VerificationResult(BaseModel):
    is_valid: bool
    is_revoked: bool
    issuer: str = None
    student: str = None
    timestamp: int = None
    error: str = None

# --- Contract Setup ---
w3 = Web3(Web3.HTTPProvider(os.environ.get('WEB3_RPC')))
contract_address = os.environ.get('CERTIFICATE_REGISTRY_ADDRESS')
with open(os.path.join(settings.BASE_DIR, 'contracts/CertificateRegistry.abi')) as f:
    abi = f.read()
contract = w3.eth.contract(address=contract_address, abi=abi)

@router.post("/verify/{certificate_hash}", response=VerificationResult)
@ratelimit(key='ip', rate='100/h', block=True)
def verify_certificate(request, certificate_hash: str, payload: RecaptchaPayload):
    if getattr(request, 'limited', False):
        return JsonResponse({"error": "Too many requests"}, status=429)

    # Verify reCAPTCHA
    recaptcha_secret = os.environ.get('RECAPTCHA_SECRET_KEY')
    if not recaptcha_secret:
        return JsonResponse({"error": "reCAPTCHA not configured"}, status=500)

    verification_data = {
        'secret': recaptcha_secret,
        'response': payload.recaptchaToken,
        'remoteip': request.META.get('REMOTE_ADDR')
    }
    resp = requests.post('https://www.google.com/recaptcha/api/siteverify', data=verification_data)
    result = resp.json()

    if not result.get('success'):
        return JsonResponse({"error": "Invalid reCAPTCHA"}, status=400)

    try:
        cert_data = contract.functions.getCertificate(w3.to_bytes(hexstr=certificate_hash)).call()
        # cert_data is a tuple: (issuer, student, timestamp, isRevoked)
        issuer, student, timestamp, is_revoked = cert_data

        # Check if the certificate exists (issuer will not be the zero address)
        if issuer == "0x0000000000000000000000000000000000000000":
            return VerificationResult(is_valid=False, error="Certificate not found.")

        return VerificationResult(
            is_valid=not is_revoked,
            is_revoked=is_revoked,
            issuer=issuer,
            student=student,
            timestamp=timestamp
        )
    except Exception as e:
        return VerificationResult(is_valid=False, error=str(e))
