#!/usr/bin/env python
import os
import django
from django.conf import settings

# Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_settings')
django.setup()

from django.contrib.auth.models import User

# Create superuser if it doesn't exist
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'AdminPassword123!')
    print("Superuser 'admin' created successfully!")
else:
    print("Superuser 'admin' already exists.")