from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    pass

class Wallet(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Account(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='accounts', null=True, blank=True)
    address = models.CharField(max_length=42, unique=True)
    private_key = models.CharField(max_length=66)
    mnemonic = models.TextField(null=True, blank=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return self.address

class AccountRole(models.Model):
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='roles')
    role = models.CharField(max_length=20)  # e.g., 'issuer', 'student'

    def __str__(self):
        return f"{self.account.address} - {self.role}"

class Certificate(models.Model):
    diploma_id = models.CharField(max_length=66, unique=True, help_text="The keccak256 hash of the certificate PDF.")
    student_address = models.CharField(max_length=42, help_text="The Ethereum address of the student.")
    issuer_address = models.CharField(max_length=42, help_text="The Ethereum address of the issuer.")
    tx_hash = models.CharField(max_length=66, unique=True, help_text="The transaction hash of the registration.")
    ipfs_hash = models.CharField(max_length=255, blank=True, null=True, help_text="The IPFS hash of the certificate PDF.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Certificate {self.diploma_id} for {self.student_address}"

class Transaction(models.Model):
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    tx_hash = models.CharField(max_length=66, unique=True)
    to_address = models.CharField(max_length=42)
    amount = models.BigIntegerField()
    status = models.CharField(max_length=20)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.tx_hash
