from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    is_verifier = models.BooleanField(default=False)
    # Add any other custom fields here

class Wallet(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='wallets')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

class Account(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='accounts', null=True, blank=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=100, unique=True)
    private_key = models.CharField(max_length=256)
    mnemonic = models.CharField(max_length=256, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Transaction(models.Model):
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    tx_hash = models.CharField(max_length=100)
    to_address = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=30, decimal_places=10)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')
