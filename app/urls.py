from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path


from django.conf import settings

from app.api.api import api
from app.api.auth.admin_login import admin_login
from app.views import issuer_certificates

urlpatterns = [
    path("app/v1/smartcontracts/", api.urls),
    path("admin/", admin.site.urls),
    path("api/admin/login/", admin_login, name="admin_login"),
    path("issuer/certificates/", issuer_certificates, name="issuer_certificates"),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
