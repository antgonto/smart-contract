# Generated by Django 5.2.3 on 2025-07-18 15:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0006_certificate_remove_account_role_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='role',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
