# greenops-api

GreenOps lokal three-tier (Kubernetes) med frontend + backend + postgres.

Detta är en minimal three-tier enligt modellen i din Guestbook-rapport:

- **Frontend**: Nginx som serverar statisk `index.html`/`styles.css` och proxyar `/api/*` till backend
- **Backend**: Node/Express API som skriver leads till Postgres
- **Database**: PostgreSQL med persistent storage + init-script

## Förkrav

- Docker Desktop (med Kubernetes **avstängt** om du kör `kind`)
- `kubectl`
- `kind` (rekommenderat) eller `minikube`

## Kör med kind (rekommenderat)

### 1) Skapa kluster

```powershell
kind create cluster --name greenops
```

### 2) Bygg images lokalt

```powershell
docker build -t greenops-backend:local .\backend
docker build -t greenops-frontend:local .\frontend
```

### 3) Ladda images in i kind

```powershell
kind load docker-image greenops-backend:local --name greenops
kind load docker-image greenops-frontend:local --name greenops
```

### 4) Deploya till Kubernetes

```powershell
kubectl apply -f .\k8s\00_namespace.yaml
kubectl apply -f .\k8s\10_postgres.yaml
kubectl apply -f .\k8s\20_backend.yaml
kubectl apply -f .\k8s\30_frontend.yaml
kubectl apply -f .\k8s\40_frontend_proxy.yaml
```

### 5) Öppna sidan

Frontend-servicen exponerar port **8081** internt i klustret. Kör port-forward:

```powershell
kubectl -n greenops port-forward svc/greenops-frontend 8081:8081
```

Öppna sen `http://localhost:8081`.

Testa API:

```powershell
curl http://localhost:8081/healthz
curl -X POST http://localhost:8081/api/leads -H "content-type: application/json" -d "{\"email\":\"test@example.com\",\"name\":\"Arash\",\"message\":\"hej\"}"
```

## Felsökning (snabbt)

```powershell
kubectl -n greenops get pods
kubectl -n greenops logs deploy/greenops-backend
kubectl -n greenops logs deploy/greenops-frontend
kubectl -n greenops logs deploy/greenops-postgres
```

## GitHub + CI (som i PDF-exemplet)

Det finns en GitHub Actions-workflow som bygger och pushar images till GitHub Container Registry (GHCR):

- `/.github/workflows/build-and-push-ghcr.yml`
- Pushar:
  - `ghcr.io/<owner>/greenops-backend:main` och `:sha-<commit>`
  - `ghcr.io/<owner>/greenops-frontend:main` och `:sha-<commit>`

### Steg

1. Skapa ett GitHub-repo (t.ex. `greenops-local-3tier`) och pusha innehållet i denna mapp.
2. Gå till repo → **Settings → Actions → General** och säkerställ att Actions är tillåtet.
3. Gå till repo → **Settings → Packages** (eller din GHCR package) och säkerställ att packages får användas.
4. Pusha till `main` → workflow kör och images hamnar i GHCR.

## Full GitOps (ArgoCD) + GHCR-images

För att ArgoCD ska kunna återskapa allt utan lokala Docker builds använder manifests nu:

- `ghcr.io/arash00009/greenops-backend:main`
- `ghcr.io/arash00009/greenops-frontend:main`

Viktigt: se till att dina GHCR-packages är pullbara från klustret:

- Antingen gör packages **Public**
- Eller skapa en `imagePullSecret` i `greenops`-namespace och referera den i Deployments

## Ingress (utan port-forward)

Ingress finns i `k8s/50_ingress.yaml` och hanteras av ArgoCD.

För att nå sidan via `http://greenops.local/` behöver du:

1. Ha `ingress-nginx` installerat i klustret
2. Lägga in i Windows hosts:

```text
127.0.0.1 greenops.local
```
