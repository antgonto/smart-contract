from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    is_verifier = models.BooleanField(default=False)
    # Add any other custom fields here

