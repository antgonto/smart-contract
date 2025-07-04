from ninja.security import HttpBearer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from app.models import CustomUser, Account

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            access_token = AccessToken(token)
            access_token.verify()

            user_id = access_token.get('user_id')
            if not user_id:
                return None

            user = CustomUser.objects.select_related('account').get(id=user_id)

            # Attach user, account, and roles to the request
            request.user = user
            request.auth_roles = access_token.get('roles', [])

            return user
        except (InvalidToken, TokenError, CustomUser.DoesNotExist):
            return None

