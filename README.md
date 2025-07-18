# Diploma Provisioning System

### Video Overview

> **Note:** GitHub does not support embedded playback of local video files. To view the video, [click here to download Video-SmartContract.mp4](Video-SmartContract.mp4?raw=true) and open it locally.

This document provides a comprehensive overview of the diploma provisioning system, including its architecture, tooling, user flows, and step-by-step instructions for configuring and running the application.

---

## Tooling Overview

### Containerization & Orchestration
- **Docker**: Containerizes backend, frontend, and supporting services.
- **Docker Compose**: Orchestrates multi-container setup for local development.

### Source Control
- **GitHub**: Version control and collaboration.

### Blockchain & Off-Chain Storage
- **Ganache**: Local Ethereum test node (Truffle Suite Docker image).
- **IPFS**: Decentralized file storage (go-ipfs Docker image).

### Smart Contract Tooling
- **py-solc-x** (`solcx`): Solidity compiler for Python.
- **web3.py**: Python library for Ethereum blockchain interaction.

### Backend
- **Python 3.18+** (containerized)
- **Django-Ninja**: Fast API framework for Django.
- **uvicorn**: ASGI server for async support.
- **ipfshttpclient**: Python client for IPFS.
- **python-dotenv**: Loads environment variables from `.env` files.
- **Postgres**: Relational database (Docker image).
- **Redis**: In-memory data store (Docker image).
- **Celery**: Distributed task queue (Docker image).

### Frontend
- **Node.js 16+** (containerized)
- **React**: UI library.
- **Elastic UI**: UI components.

### DevOps & Pipeline
- **pre-commit**: Git hooks for code quality.
- **ruff**: Python linter.
- **GitHub Actions**: CI/CD automation.
- **Kubernetes**: Container orchestration.
- **Argo**: Workflow automation.

---

## Architecture

The system is a full-stack application with the following components:

- **Frontend**: React app for user interaction.
- **Backend**: Django-Ninja API for business logic and blockchain interaction.
- **Blockchain**: Ganache simulates Ethereum for contract deployment and transactions.
- **Off-chain Storage**: IPFS stores diploma files.
- **Database**: Postgres for persistent data; Redis for caching and Celery tasks.

All services are containerized and orchestrated via Docker Compose for local development.

---

## User Flows

1. **Diploma Issuance**
   - Issuer logs in and uploads a diploma PDF.
   - Backend hashes the file, stores it on IPFS, and records the hash on the blockchain.
   - Certificate metadata is saved in the database.

2. **Diploma Verification**
   - Verifier enters a diploma hash or scans a QR code.
   - Backend fetches metadata from the blockchain and IPFS.
   - Frontend displays verification result.

3. **Account & Wallet Management**
   - Users can create wallets/accounts.
   - Roles (issuer, student) are assigned and managed.

---

## Environment Setup & Running the Application

### 1. Prerequisites
- **PyCharm Professional** (recommended for Django, JS, Docker support)
- **Python 3.11+**
- **Node.js & npm**
- **Docker Desktop**

### 2. Clone the Repository
Clone the project from GitHub and open it in PyCharm.

### 3. Start Essential Services
In the terminal, run:
```bash
docker-compose -f docker-compose-local.yml up -d ganache ipfs redis
```

### 4. Backend Setup
- Create a Python virtual environment (e.g., `venv/`).
- Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```
- Set environment variables for backend (see below).
- Run migrations:
  ```bash
  python manage.py migrate
  ```

#### Backend Environment Variables
- `GANACHE_RPC_URL=http://localhost:8545`
- `IPFS_API_URL=/dns/localhost/tcp/5001/http`
- `REDIS_URL=redis://localhost:6379/0`
- `DJANGO_SETTINGS_MODULE=app.settings`
- `PYTHONUNBUFFERED=1`

### 5. Frontend Setup
- Navigate to the `frontend` directory:
  ```bash
  cd frontend
  ```
- Install dependencies:
  ```bash
  npm install
  ```

### 6. Running the Application
- **Backend**: Run the Django server (default port 8000).
- **Frontend**: Run the React app (default port 3000).

Access the frontend at `http://localhost:3000` and the backend API at `http://localhost:8000`.

---

## Additional Notes
- Use PyCharm's Run/Debug configurations for streamlined development.
- All services can be monitored via Docker or PyCharm's Services tool window.
- For production, adapt the Docker Compose and environment settings as needed.

---

For more details, refer to the original `README.md` and `Pycharm_tutorial.md` files.
