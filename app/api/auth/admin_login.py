from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

@csrf_exempt
def admin_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is not None and user.is_staff:
        login(request, user)
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=401)

