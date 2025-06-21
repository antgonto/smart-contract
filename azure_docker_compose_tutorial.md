# Deploying Your Certificate Management System to Azure with Docker Compose

This guide shows how to deploy your Django backend, React frontend, and blockchain services to Azure App Service using Docker Compose.

## 1. Prerequisites

- **Azure Subscription** – https://portal.azure.com
- **Azure CLI** (v2.0+)
- **Docker & Docker Compose**
- (Optional) **Git**

Verify installations:
```bash
az --version
docker --version
docker-compose --version
```

## 2. Prepare Your Project

az upgrade
python -m pip install --upgrade pip

- Ensure your `docker-compose.yml` is in the project root and defines all services:
  - Django backend (from `backend.Dockerfile` or similar)
  - React frontend (from `frontend/frontend.Dockerfile`)
  - Ganache, IPFS, etc. (from `docker/ganache.Dockerfile`, `docker/ipfs.Dockerfile`)

## 3. Push Images to Azure Container Registry (ACR)

```bash
az login
az group create --name contractsResourceGroup --location eastus

# Register the Container Registry provider if needed
az provider register --namespace Microsoft.ContainerRegistry
# (Optional) Check registration status
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState"

az acr create --resource-group contractsResourceGroup --name bccontractsregistry --sku Basic
az acr login --name bccontractsregistry

az acr update --name bccontractsregistry --admin-enabled true
az acr credential show --name bccontractsregistry

# Output similar to the following will be shown:
# {
#   "username": "contractsRegistry",
#   "passwords": [
#     {"name": "password", "value": "YOUR_PASSWORD"},
#     {"name": "password2", "value": "YOUR_PASSWORD2"}
#   ]
# }

docker login bccontractsregistry.azurecr.io -u bccontractsregistry -p YOUR_PASSWORD

# Tag and push each image
# Backend
docker build -t bccontractsregistry.azurecr.io/contracts-backend:latest -f backend.Dockerfile .
docker push bccontractsregistry.azurecr.io/contracts-backend:latest
# Frontend
cd frontend
docker build -t bccontractsregistry.azurecr.io/contracts-frontend:latest -f frontend.Dockerfile .
docker push bccontractsregistry.azurecr.io/contracts-frontend:latest
cd ..
# Ganache
docker build -t bccontractsregistry.azurecr.io/contracts-ganache:latest -f ganache.Dockerfile .
docker push bccontractsregistry.azurecr.io/contracts-ganache:latest
# IPFS
docker pull ipfs/go-ipfs:latest
docker tag ipfs/go-ipfs:latest bccontractsregistry.azurecr.io/contracts-ipfs:latest
docker push bccontractsregistry.azurecr.io/contracts-ipfs:latest
```

## 4. Update docker_compose_azure.yml for Azure
- Use your ACR image URLs in `image:` fields (not `build:`)

```yaml
services:
  django:
    container_name: django
    image: bccontractsregistry.azurecr.io/contracts-backend:latest
    platform: linux/amd64
    command: sh -c "python3 manage.py migrate && python3 -m daphne -b 0.0.0.0 app.asgi:application --port 8000"
    env_file:
      - .env
    environment:
      DJANGO_SECRET_KEY:      ${DJANGO_SECRET_KEY}
      DJANGO_SETTINGS_MODULE: ${DJANGO_SETTINGS_MODULE}
      WEB3_RPC:               ${WEB3_RPC}
      CHAIN_ID:               ${CHAIN_ID}
      IPFS_API:               ${IPFS_API}
      AKEYLESS_STORE_NAME:    ${AKEYLESS_STORE_NAME}
    volumes:
      - .:/code
    ports:
      - "8000:8000"
    depends_on:
      redis:
        condition: service_healthy
      ganache:
        condition: service_healthy
      ipfs:
        condition: service_healthy
    networks:
      - contract_network
    restart: unless-stopped
    healthcheck:
      test: curl --fail http://django:8000/app/v1/smartcontracts/docs || exit 1
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  ganache:
    container_name: ganache
    image: bccontractsregistry.azurecr.io/contracts-ganache:latest
    platform: linux/amd64
    command:
      - --host=0.0.0.0
      - --port=${GANACHE_PORT}
      - --chain.chainId=${GANACHE_CHAIN_ID}
      - --chain.networkId=${GANACHE_NETWORK_ID}
      - --wallet.mnemonic=${GANACHE_MNEMONIC}
      - --miner.defaultGasPrice=${GANACHE_GAS_PRICE}
    env_file:
      - .env
    ports:
      - "${GANACHE_PORT}:${GANACHE_PORT}"
    healthcheck:
      test: ["CMD", "curl", "-X", "POST", "--data", "{\"jsonrpc\":\"2.0\",\"method\":\"web3_clientVersion\",\"params\":[],\"id\":1}", "http://localhost:8545"]
      interval: 5s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - contract_network
    restart: unless-stopped

  ipfs:
    container_name: ipfs
    image: bccontractsregistry.azurecr.io/contracts-ipfs:latest
    env_file:
      - .env
    environment:
      IPFS_API: ${IPFS_API}
    ports:
      - "${IPFS_5001_PORT}:${IPFS_5001_PORT}"
      - "${IPFS_8080_PORT}:${IPFS_8080_PORT}"
      - "${IPFS_4001_PORT}:${IPFS_4001_PORT}"
    volumes:
      - ipfs_data:/data/ipfs
    networks:
      - contract_network
    restart: unless-stopped

  redis:
    container_name: redis
    image: redis:8.0-M04-bookworm
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    env_file:
      - .env
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 5s
      retries: 3
      start_period: 10s
    volumes:
      - redis_data:/data
    networks:
      - contract_network
    restart: unless-stopped

  frontend:
    container_name: frontend
    image: bccontractsregistry.azurecr.io/contracts-frontend:latest
    platform: linux/amd64
    env_file:
      - .env
    environment:
      REACT_APP_API_URL: ${REACT_APP_API_URL}
    ports:
      - "3000:80"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      django:
        condition: service_healthy
    networks:
      - contract_network
    restart: unless-stopped

volumes:
  redis_data:
  ipfs_data:

networks:
  contract_network:
    name: contract_network
    driver: bridge
    external: true
```

## 5. Deploy to Azure App Service

### Check and Request App Service Quota Increase (if needed)

Upgrade your account to a pay-as-you-go subscription if you haven't already.

To deploy your Docker Compose application to Azure App Service, you may need to increase your quota limits for resources like App Service Plans or Basic VMs.

1. Go to the [Azure Portal Quotas page](https://portal.azure.com/#blade/Microsoft_Azure_Capacity/UsageAndQuota.ReactView/).
2. Create `contractsServicePlan` in the `contractsResourceGroup` resource group.
2. Filter by the resource type and region you need (e.g., Microsoft.Web/serverFarms for App Service Plans in eastus).
3. Select the quota you want to increase (such as Basic VMs or App Service Plan vCPUs).
4. Click **Request Increase**.
5. Enter a new limit that is higher than your current and anticipated needs, especially if you expect to run or scale multiple services.
6. Submit the request and wait for Microsoft to approve it.

> **Tip:** If you experience multiple scaling operations failing, consider requesting a quota limit higher than the minimum required to accommodate aggregate needs.

az config set extension.dynamic_install_allow_preview=true
az config set extension.use_dynamic_install=yes_without_prompt

az extension add --name quota

You must register the Microsoft.Capacity provider:

```bash
az provider register --namespace Microsoft.Capacity
az provider show --namespace Microsoft.Capacity --query "registrationState"
```
You must wait for the quota increase to be approved before you can create an App Service plan in that region.


```bash
# Register the App Service provider if needed
az provider register --namespace Microsoft.Web
az provider show --namespace Microsoft.Web --query "registrationState"

> **Note:** If you experience multiple scaling operations failing (in addition to this one) and need to accommodate the aggregate quota requirements of these operations, you will need to request a higher quota limit than the one currently displayed.

# Use a unique name for the App Service Plan in each region
az appservice plan create --name contractsServicePlan --resource-group contractsResourceGroup --is-linux --sku B1 --location eastus
az webapp create --resource-group contractsResourceGroup --plan contractsServicePlan --name contractsAppService --multicontainer-config-type compose --multicontainer-config-file docker_compose_azure.yml
```

## 6. Configure Environment Variables

# Configure all environment variables from your .env file in Azure App Service:

```
az webapp config appsettings set --resource-group contractsResourceGroup --name contractsAppService --settings POSTGRES_USERNAME=postgres POSTGRES_PASSWORD=postgres POSTGRES_DATABASE=contracts POSTGRES_HOST=contracts_db POSTGRES_PORT=5432 REDIS_PASSWORD=redis REDIS_PORT=6379 GANACHE_PORT=8545 GANACHE_NETWORK_ID=5777 GANACHE_CHAIN_ID=1337 GANACHE_MNEMONIC="test test test test test test test test test test test junk" GANACHE_GAS_PRICE=20000000000 DJANGO_SECRET_KEY=your-django-secret-key DJANGO_SETTINGS_MODULE=app.settings WEB3_RPC=http://ganache:8545 CHAIN_ID=1337 IPFS_API=http://ipfs:5001 AKEYLESS_ACCESS_ID=akless_123 AKEYLESS_SECRET=xyz AKEYLESS_TENANT=your-tenant AKEYLESS_STORE_NAME=cert-platform REACT_APP_API_URL=http://django:8000/api IPFS_5001_PORT=5001 IPFS_8080_PORT=8080 IPFS_4001_PORT=4001
```


## 7. Monitor

- View logs:
  ```bash
  az webapp log tail --resource-group contractsResourceGroup --name contractsAppService
  ```


- Create the web app:

## 8. (Optional) Custom Domain & HTTPS

### Set up a Custom Domain in Azure App Service

1. **Go to the Azure Portal:**
   https://portal.azure.com

2. **Navigate to your App Service:**
   - In the left sidebar, click on **App Services**.
   - Select your app (e.g., `contractsAppService`).

3. **Add a Custom Domain:**
   - In the App Service menu, click **Custom domains**.
   - Click **Add custom domain**.
   - Enter your custom domain name (e.g., `www.yourdomain.com`).
   - Follow the instructions to verify domain ownership (usually by adding a TXT or A record to your DNS provider).
   - Once verified, click **Add custom domain** to complete the process.

4. **(Recommended) Enable HTTPS:**
   - In the **Custom domains** blade, click **Add binding** under the TLS/SSL bindings section.
   - Select your custom domain and choose **App Service Managed Certificate** (free) or upload your own certificate.
   - Click **Add Binding**.

5. **Save and Test:**
   - Wait a few minutes for DNS propagation and certificate provisioning.
   - Visit your custom domain in a browser to verify it loads your Azure App Service securely.

> For more details, see: [Map a custom domain to an Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain)

---

**Project structure notes:**
- Backend: `app/`  
- Frontend: `frontend/`  
- Smart contracts: `contracts/`  
- Compose file: `docker-compose.yml`  
- Dockerfiles: `backend.Dockerfile`, `frontend/frontend.Dockerfile`, `docker/ganache.Dockerfile`, etc.

**Tips:**
- Automate with GitHub Actions or Azure DevOps
- Use Azure Monitor for logs/alerts
- Use deployment slots for zero-downtime updates
