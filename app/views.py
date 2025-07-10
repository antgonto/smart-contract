from django.shortcuts import render
from django.http import HttpRequest
import requests
from django.conf import settings

def issuer_certificates(request: HttpRequest):
    # Call the API endpoint to get all certificates
    api_url = '/app/v1/smartcontracts/smartcontract/list_certificates'  # Adjust if needed
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        certificates = response.json().get('certificates', [])
    except Exception as e:
        certificates = []
    return render(request, 'app/issuer_certificates.html', {'certificates': certificates})

