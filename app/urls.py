from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path


from django.conf import settings

from app.api.api import api

urlpatterns = [
    path("app/v1/smartcontracts/", api.urls),
    path("admin/", admin.site.urls),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
