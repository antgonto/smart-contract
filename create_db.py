import os
import psycopg

db_name = os.environ.get("POSTGRES_DB", "contracts")
db_user = os.environ.get("POSTGRES_USER", "postgres")
db_password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_host = os.environ.get("POSTGRES_HOST", "localhost")
db_port = os.environ.get("POSTGRES_PORT", "5432")

try:
    with psycopg.connect(
        dbname="postgres",
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port,
        autocommit=True
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
            exists = cur.fetchone()
            if exists:
                print(f"Database {db_name} already exists and will be dropped to recreate it.")
                cur.execute(f'DROP DATABASE IF EXISTS "{db_name}"')

            # Create the database
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Database {db_name} created.")
except Exception as e:
    print(f"Database check/create failed: {e}")