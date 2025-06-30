# Certificate Registry on GKE Tutorial

Below is a comprehensive, step‑by‑step tutorial to deploy the certificate‑registry stack on **Google Kubernetes Engine (GKE)** in GCP. We’ll containerize the Python‑only backend (Django‑Ninja), IPFS, Ganache Ethereum node, and React UI; push images to Google Container Registry (GCR); and run them as Kubernetes Deployments with Services and an Ingress.

---

## Prerequisites

1. **GCP Account & Project**
   - Create or select a GCP project and note its ID (`$PROJECT_ID`).
   - Enable APIs:
     ```bash
     gcloud services enable container.googleapis.com containerregistry.googleapis.com compute.googleapis.com
     ```
2. **Local Tooling**
   - **gcloud SDK**: https://cloud.google.com/sdk/docs/install
   - **kubectl**: `gcloud components install kubectl`
   - **Docker**: https://docs.docker.com/engine/install/
   - **Akeyless CLI**: https://docs.akeyless.io/docs/cli-installation
     Use `akeyless login` to authenticate to your Akeyless tenant.
   - **Git** (optional)
3. **Kubernetes Knowledge**: Familiarity with `kubectl`, Deployments, Services, ConfigMaps, Secrets, and Ingress.

---

## 1. Clone & Prepare Code

```bash
git clone https://your.repo.url/cert-platform.git
cd cert-platform
```

Ensure your directory contains:
```
cert-platform/
├─ backend/                  # Django‑Ninja API
├─ frontend/                 # React UI
├─ scripts/                  # deploy_contract.py, upload_to_ipfs.py
├─ contracts/                # CertificateRegistry.sol
├─ k8s/                      # Kubernetes manifests
└─ .env.example
```

---

## 2. Build & Push Docker Images to GCR

First, configure Docker to authenticate with GCR:
```bash
gcloud auth configure-docker
```

### 2.1 Backend Image

```bash
# from project root
docker build \
  -t gcr.io/$PROJECT_ID/cert-app:latest \
  -f app/Dockerfile ./app

docker push gcr.io/$PROJECT_ID/cert-app:latest
```

### 2.2 Frontend Image

```bash
docker build \
  -t gcr.io/$PROJECT_ID/cert-frontend:latest \
  -f frontend/Dockerfile ./frontend

docker push gcr.io/$PROJECT_ID/cert-frontend:latest
```

### 2.3 Support Services (IPFS, Ganache)

We’ll use public images; no push needed.
- **IPFS**: `ipfs/go-ipfs:latest`
- **Ganache CLI**: `trufflesuite/ganache-cli:latest`

---

## 3. Configure Kubernetes Manifests

Create a new folder `k8s/` and add the following YAML files.

### 3.1 Namespace & ConfigMap

**k8s/namespace-config.yaml**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-platform
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cert-config
  namespace: cert-platform
data:
  WEB3_RPC: "http://ganache:8545"
  CHAIN_ID: "1337"
  IPFS_API: "http://ipfs:5001"
```

### 3.2 Akeyless ExternalSecret

**k8s/external-secret.yaml**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cert-secrets
  namespace: cert-platform
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: akeyless-store
    kind: ClusterSecretStore
  target:
    name: cert-secrets
    creationPolicy: Owner
  data:
  - secretKey: PRIVATE_KEY
    remoteRef:
      key: cert-platform/private-key
  - secretKey: CONTRACT_ADDR
    remoteRef:
      key: cert-platform/contract-addr
```

> *Optional static Secret fallback included in comments.*

### 3.3 Ganache Deployment & Service

**k8s/ganache.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ganache
  namespace: cert-platform
spec:
  replicas: 1
  selector:
    matchLabels: { app: ganache }
  template:
    metadata: { labels: { app: ganache } }
    spec:
      containers:
      - name: ganache
        image: trufflesuite/ganache-cli:latest
        args: ["--host","0.0.0.0","--port","8545","--defaultBalanceEther","1000"]
        ports:
        - containerPort: 8545
---
apiVersion: v1
kind: Service
metadata:
  name: ganache
  namespace: cert-platform
spec:
  type: ClusterIP
  ports:
  - port: 8545
    targetPort: 8545
  selector: { app: ganache }
```

### 3.4 IPFS Deployment & Service

**k8s/ipfs.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ipfs
  namespace: cert-platform
spec:
  replicas: 1
  selector:
    matchLabels: { app: ipfs }
  template:
    metadata: { labels: { app: ipfs } }
    spec:
      containers:
      - name: ipfs
        image: ipfs/go-ipfs:latest
        ports:
        - containerPort: 5001
        - containerPort: 8080
        - containerPort: 4001
---
apiVersion: v1
kind: Service
metadata:
  name: ipfs
  namespace: cert-platform
spec:
  type: ClusterIP
  ports:
  - name: api
    port: 5001
    targetPort: 5001
  - name: gateway
    port: 8080
    targetPort: 8080
  selector: { app: ipfs }
```

### 3.5 Backend Deployment & Service

**k8s/backend.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cert-app
  namespace: cert-platform
spec:
  replicas: 2
  selector:
    matchLabels: { app: cert-app }
  template:
    metadata: { labels: { app: cert-app } }
    spec:
      containers:
      - name: cert-app
        image: gcr.io/$PROJECT_ID/cert-app:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef: { name: cert-config }
        - secretRef: { name: cert-secrets }
---
apiVersion: v1
kind: Service
metadata:
  name: cert-app
  namespace: cert-platform
spec:
  type: ClusterIP
  ports:
  - port: 8000
    targetPort: 8000
  selector: { app: cert-app }
```

### 3.6 Frontend Deployment & Service

**k8s/frontend.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cert-frontend
  namespace: cert-platform
spec:
  replicas: 2
  selector:
    matchLabels: { app: cert-frontend }
  template:
    metadata: { labels: { app: cert-frontend } }
    spec:
      containers:
      - name: cert-frontend
        image: gcr.io/$PROJECT_ID/cert-frontend:latest
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: cert-frontend
  namespace: cert-platform
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
  selector: { app: cert-frontend }
```

### 3.7 Ingress

**k8s/ingress.yaml**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cert-ingress
  namespace: cert-platform
  annotations:
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
  - host: cert.example.com
    http:
      paths:
      - path: /api/
        pathType: Prefix
        backend:
          service:
            name: cert-app
            port: { number: 8000 }
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cert-frontend
            port: { number: 3000 }
```

---

## 4. Deploy to GKE

1. **Authenticate & set project**:
   ```bash
   gcloud auth login
   gcloud config set project $PROJECT_ID
   ```
2. **Create GKE cluster**:
   ```bash
   gcloud container clusters create cert-cluster      --zone us-central1-a --num-nodes 3      --enable-ip-alias
   ```
3. **Get credentials**:
   ```bash
   gcloud container clusters get-credentials cert-cluster --zone us-central1-a
   ```
4. **Apply manifests**:
   ```bash
   kubectl apply -f k8s/namespace-config.yaml
   kubectl apply -f k8s/external-secret.yaml
   kubectl apply -f k8s/ganache.yaml
   kubectl apply -f k8s/ipfs.yaml
   kubectl apply -f k8s/app.yaml
   kubectl apply -f k8s/frontend.yaml
   kubectl apply -f k8s/ingress.yaml
   ```
5. **Verify**:
   ```bash
   kubectl get pods -n cert-platform
   kubectl get svc,ing -n cert-platform
   ```
6. **DNS**: Point `cert.example.com` → Ingress IP (from `kubectl get ingress`).

---

## 5. Interact

- **Deploy contract**:
  ```bash
  curl -X POST https://cert.example.com/api/deploy/
  ```
  Copy the returned address into your Akeyless secret or update the `cert-secrets` and reapply.

- **Issue certificate**: Browse `https://cert.example.com/`, select your file, and click **Upload**.

- **Verify**:
  ```bash
  curl https://cert.example.com/api/verify/<CID>
  ```

---

## 6. Next Steps & Production Tips

- **Secrets Management**: Use GCP Secret Manager + Workload Identity for production.
- **Auto-Scaling**: Enable HPA based on CPU/RAM or custom metrics.
- **TLS**: Use Cert-Manager for managed certificates.
- **Monitoring**: Integrate Cloud Monitoring & Logging.
- **CI/CD**: Automate with Cloud Build and GitHub Actions.

### GitOps with Argo CD

To enable declarative, pull-based deployments using Argo CD:

1. **Install Argo CD in the cluster**:
   ```bash
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```
2. **Expose the Argo CD API Server** (e.g. LoadBalancer):
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: argocd-server
     namespace: argocd
     annotations:
       service.beta.kubernetes.io/aws-load-balancer-type: "nlb"  # or GCP annotation
   spec:
     type: LoadBalancer
     ports:
       - name: https
         port: 443
         targetPort: 8080
     selector:
       app.kubernetes.io/name: argocd-server
   ```
3. **Login**:
   ```bash
   # Retrieve initial password
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
   # Login via CLI
   argocd login <ARGOCD_SERVER> --username admin --password <PASSWORD>
   ```
4. **Create an Argo CD Application** pointing to your Git repo and `k8s/` path:
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: cert-platform
     namespace: argocd
   spec:
     project: default
     source:
       repoURL: 'https://github.com/your-org/cert-platform'
       targetRevision: HEAD
       path: k8s
     destination:
       server: 'https://kubernetes.default.svc'
       namespace: cert-platform
     syncPolicy:
       automated:
         prune: true
         selfHeal: true
   ```
5. **Sync & Observe**:
   ```bash
   argocd app sync cert-platform
   argocd app status cert-platform
   ```

With Argo CD, any push to your `k8s/` folder in GitHub will automatically sync to GKE, ensuring a GitOps workflow.

---

🎉 You now have a cloud‑native, Kubernetes‑hosted, Python‑driven certificate‑registry stack on GCP—managed via Argo CD for GitOps deployments!
