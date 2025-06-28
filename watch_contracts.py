import time
import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os

CONTRACTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../app/contracts"))
COMPILE_ENDPOINT = os.environ.get("COMPILE_ENDPOINT", "http://django:8000/app/v1/smartcontracts/compile/")

class ContractChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(".sol"):
            print(f"Detected change in {event.src_path}, triggering recompilation...")
            try:
                r = requests.post(COMPILE_ENDPOINT)
                print(f"Compile endpoint response: {r.status_code} {r.text}")
            except Exception as e:
                print(f"Failed to call compile endpoint: {e}")

if __name__ == "__main__":
    print(f"Watching {CONTRACTS_DIR} for Solidity changes...")
    event_handler = ContractChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, CONTRACTS_DIR, recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
