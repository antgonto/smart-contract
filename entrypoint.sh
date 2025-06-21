#!/bin/bash
cd /code

# Install or upgrade django-cors-headers
pip3 install django-cors-headers --upgrade

echo "ENV: $ENVIRONMENT"
if [ "$ENVIRONMENT" = "PRODUCTION" ]; then
    echo "Running Django Migrations"
    python3 manage.py migrate --noinput
    echo "Collecting Static Files"
    python3 manage.py collectstatic --noinput
else
    echo "Running Django Migrations in development mode"
    python3 manage.py migrate --noinput
    # Add collectstatic for development too
    echo "Collecting Static Files in development"
    python3 manage.py collectstatic --noinput
fi

echo "Starting Daphne server"
exec daphne app.asgi:application -b 0.0.0.0 -p 8000