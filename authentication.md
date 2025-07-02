# Django Authentication & User Stats Setup

This guide explains how to enable and use Django's authentication system for your certificate registry application, and how to ensure the User & Issuer Stats work as intended.

---

---

## Automated Setup

The following steps are now automated during the Docker build process:

- A Django superuser with username `admin` and password `admin` is created.
- The `verifier` group is created and the `admin` user is added to it.
- The boolean field `is_verifier` is set to `True` for the `admin` user (if your user model supports it).

You do **not** need to manually create the admin user, verifier group, or set the `is_verifier` field. This is handled by the build process using a custom Django management command.

**Note:**
- The custom user model is located in the `app` Django app, not `users`.
- The correct reference in `settings.py` is:
  ```python
  AUTH_USER_MODEL = 'app.CustomUser'
  ```
- All migration commands and references should use `app` instead of `users`.

---

## What You Need To Do for User & Issuer Stats

1. **Create users** in your Django admin or via the shell.
2. **Log in** to the application (using Django's authentication system) so that sessions are created.
3. **Assign users** to the "verifier" group or set the `is_verifier` field if you want verifiers to be counted.
4. **Assign staff status** or the "issuer" group to users you want counted as issuers.

## Enabling Django Authentication

1. **Enable Django’s Authentication URLs:**
   - In your `urls.py`, include Django’s built-in authentication URLs:
     ```python
     from django.urls import path, include
     urlpatterns = [
         # ...existing code...
         path('accounts/', include('django.contrib.auth.urls')),
     ]
     ```
   - This provides login, logout, and password management views at `/accounts/login/`, `/accounts/logout/`, etc.

2. **Create a Superuser:**
   - Run:
     ```bash
     python manage.py createsuperuser
     ```
   - Follow the prompts to set up an admin user.

3. **Access the Login Page:**
   - Visit `http://<your-domain>/accounts/login/` in your browser.
   - Log in with your Django user credentials.

4. **(Optional) Add Login Links to Your Frontend:**
   - Add a link or button in your React frontend to `/accounts/login/` for user convenience.

5. **Verify Sessions:**
   - After logging in, Django will create a session for the user, which is used for authentication and for tracking active users in your backend logic.

## Assigning Users to Groups and Roles

- **Verifiers:**
  - You can count users as verifiers in two ways:
    1. **Group Method:**
       - In the Django admin, go to the Groups section and create a group named `verifier` if it does not exist.
       - Add users to the `verifier` group. Any user in this group will be counted as a verifier.
    2. **Boolean Field Method:**
       - If your User model has a boolean field `is_verifier`, set this field to `True` for users you want counted as verifiers.
       
       **How to do this:**
       1. **Check if your User model has the `is_verifier` field:**
          - If not, extend your User model (custom user or profile) and add:
            ```python
            from django.contrib.auth.models import AbstractUser
            from django.db import models
            class CustomUser(AbstractUser):
                is_verifier = models.BooleanField(default=False)
            ```
          - Set `AUTH_USER_MODEL = 'app.CustomUser'` in `settings.py` and run migrations.
       2. **Set the field for users:**
          - In Django admin, edit the user and check `is_verifier`.
          - Or, in the Django shell:
            ```python
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(username='yourusername')
            user.is_verifier = True
            user.save()
            ```
       3. **Save the changes.** The user will now be counted as a verifier.

- **Issuers:**
  - You can count users as issuers in two ways:
    1. **Staff Status:**
       - In the Django admin, edit the user and check the `Staff status` box (`is_staff=True`).
       - Any user with staff status will be counted as an issuer.
    2. **Group Method:**
       - (Optional) You can also create a group named `issuer` and add users to it if you want to manage issuers by group.

> **Note:** The backend will count verifiers using the group method if the group exists, otherwise it will look for the `is_verifier` field. Issuers are counted by `is_staff` by default.

---

## Defining a Custom User Model

If you do not have a user model and want to use the `is_verifier` field, follow these steps:

1. **Create the model:**
   - In `app/users/models.py`:
     ```python
     from django.contrib.auth.models import AbstractUser
     from django.db import models

     class CustomUser(AbstractUser):
         is_verifier = models.BooleanField(default=False)
     ```
2. **Register the model in the admin:**
   - In `app/users/admin.py` (create this file if it does not exist):
     ```python
     from django.contrib import admin
     from .models import CustomUser

     admin.site.register(CustomUser)
     ```
3. **Update your settings:**
   - In `settings.py`, add:
     ```python
     AUTH_USER_MODEL = 'app.CustomUser'
     ```
4. **Make migrations and migrate:**
   - Run:
     ```bash
     python manage.py makemigrations app
     python manage.py migrate
     ```
5. **Create a superuser:**
   - Run:
     ```bash
     python manage.py createsuperuser
     ```
6. **Set `is_verifier` in Django admin:**
   - Log in to the admin site, edit a user, and check the `is_verifier` box.

Now you can use the Boolean Field Method for verifiers as described above.

---

## Registering the Custom User Model in Django Admin

To manage your custom user model (`CustomUser`) through the Django admin interface:

1. Ensure you have an `admin.py` file in your app directory (usually `app/admin.py`).
2. Add the following code to `admin.py`:
   ```python
   from django.contrib import admin
   from .models import CustomUser

   admin.site.register(CustomUser)
   ```
3. This will allow you to view, add, and edit users via the Django admin panel at `/admin/`.

---

## Troubleshooting: Apps aren't loaded yet

If you see the error:

```
django.core.exceptions.AppRegistryNotReady: Apps aren't loaded yet.
```

This means you are trying to use Django models or ORM features before Django has finished loading all apps. To avoid this:

- Do not run ORM/model code at the top level of your modules.
- Only access models after Django is fully loaded (e.g., inside views, management commands, or after `django.setup()` in scripts).
- If you are running a standalone script, add these lines at the top before importing models:
  ```python
  - #import django 
  - #django.setup()
  ```

This ensures the app registry is ready before you use any models or ORM features.

---

## Notes
- If you do not authenticate, `active_users` will always be 0, because there are no sessions with authenticated users.
- Make sure your Django user model and groups are set up as expected (especially for verifiers and issuers).
- The backend logic for User & Issuer Stats relies on these users, groups, and sessions being present and active.
