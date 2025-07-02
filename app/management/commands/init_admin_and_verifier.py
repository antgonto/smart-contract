from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

class Command(BaseCommand):
    help = 'Create default admin user, verifier group, and set is_verifier'

    def handle(self, *args, **options):
        User = get_user_model()
        username = 'admin'
        password = 'admin'
        email = 'admin@example.com'
        group_name = 'verifier'
        print()
        # Create superuser if not exists
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(username=username, password=password, email=email)
            self.stdout.write(self.style.SUCCESS(f'Created superuser {username}'))
        else:
            user = User.objects.get(username=username)
            self.stdout.write(self.style.WARNING(f'Superuser {username} already exists'))

        # Create verifier group if not exists
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created group {group_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Group {group_name} already exists'))

        # Add user to verifier group
        user.groups.add(group)
        self.stdout.write(self.style.SUCCESS(f'Added {username} to group {group_name}'))

        # Set is_verifier to True if field exists
        if hasattr(user, 'is_verifier'):
            user.is_verifier = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Set is_verifier=True for {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'User model has no is_verifier field'))

