import socket

def check_connectivity(host, port):
    try:
        with socket.create_connection((host, port), timeout=5):
            print("Connection successful")
    except Exception as e:
        print(f"Connection failed: {e}")

# Replace with your target container's hostname and port
check_connectivity("ganache", 8545)