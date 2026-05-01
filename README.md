# 🌿 GreenOps API

> A production-ready three-tier application deployed on Kubernetes — featuring a static frontend, a Node.js/Express REST API backend, and a PostgreSQL database with persistent storage.

[![CI](https://github.com/arash00009/greenops-api/actions/workflows/build-and-push-ghcr.yml/badge.svg)](https://github.com/arash00009/greenops-api/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-ready-blue?logo=kubernetes)](https://kubernetes.io/)
[![Docker](https://img.shields.io/badge/Docker-containerized-blue?logo=docker)](https://www.docker.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [CI/CD Pipeline](#cicd-pipeline)
- [GitOps with ArgoCD](#gitops-with-argocd)
- [Ingress Setup](#ingress-setup)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## Overview

**GreenOps API** is a minimal, cloud-native three-tier application built to demonstrate a complete Kubernetes deployment pipeline. It collects lead submissions via a frontend form, stores them in a PostgreSQL database, and exposes a RESTful API — all running inside a local Kubernetes cluster.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Kubernetes Cluster              │
│                                                  │
│  ┌────────────┐    ┌────────────┐    ┌────────┐  │
│  │  Frontend  │───▶│  Backend   │───▶│  Postgres│ │
│  │  (Nginx)   │    │ (Node/Express)  │  (DB)  │  │
│  └────────────┘    └────────────┘    └────────┘  │
│       :8081             /api/*        :5432       │
└─────────────────────────────────────────────────┘
```

| Tier       | Technology          | Role                                           |
|------------|---------------------|------------------------------------------------|
| Frontend   | Nginx               | Serves static HTML/CSS and proxies `/api/*`    |
| Backend    | Node.js + Express   | REST API — handles lead submissions to Postgres|
| Database   | PostgreSQL          | Persistent storage with init script            |

---

## Prerequisites

Ensure the following tools are installed before getting started:

| Tool           | Description                                 | Required |
|----------------|---------------------------------------------|----------|
| Docker Desktop | Container runtime                           | ✅        |
| `kubectl`      | Kubernetes CLI                              | ✅        |
| `kind`         | Local Kubernetes cluster (recommended)      | ✅        |
| `minikube`     | Alternative to kind                         | Optional |

> **Note:** If using `kind`, make sure Kubernetes is **disabled** in Docker Desktop to avoid port conflicts.

---

## Getting Started

### 1. Create a local Kubernetes cluster

```bash
kind create cluster --name greenops
```

### 2. Build Docker images locally

```bash
docker build -t greenops-backend:local ./backend
docker build -t greenops-frontend:local ./frontend
```

### 3. Load images into the kind cluster

```bash
kind load docker-image greenops-backend:local --name greenops
kind load docker-image greenops-frontend:local --name greenops
```

### 4. Deploy all Kubernetes manifests

```bash
kubectl apply -f ./k8s/00_namespace.yaml
kubectl apply -f ./k8s/10_postgres.yaml
kubectl apply -f ./k8s/20_backend.yaml
kubectl apply -f ./k8s/30_frontend.yaml
kubectl apply -f ./k8s/40_frontend_proxy.yaml
```

### 5. Access the application

Forward the frontend service port to your local machine:

```bash
kubectl -n greenops port-forward svc/greenops-frontend 8081:8081
```

Then open your browser at [http://localhost:8081](http://localhost:8081).

---

## API Reference

Base URL: `http://localhost:8081`

### Health Check

```http
GET /healthz
```

**Response:**
```json
{ "status": "ok" }
```

---

### Submit a Lead

```http
POST /api/leads
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Arash",
  "email": "test@example.com",
  "message": "Hello!"
}
```

**Example with curl:**

```bash
curl -X POST http://localhost:8081/api/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Arash","message":"Hello!"}'
```

---

## CI/CD Pipeline

The repository includes a GitHub Actions workflow that automatically builds and pushes Docker images to **GitHub Container Registry (GHCR)** on every push to `main`.

**Workflow file:** `.github/workflows/build-and-push-ghcr.yml`

**Published images:**

| Image | Tags |
|-------|------|
| `ghcr.io/arash00009/greenops-backend` | `main`, `sha-<commit>` |
| `ghcr.io/arash00009/greenops-frontend` | `main`, `sha-<commit>` |

### Setup Steps

1. Push the repository to GitHub.
2. Navigate to **Settings → Actions → General** and ensure Actions are allowed.
3. Navigate to **Settings → Packages** and ensure packages are enabled.
4. Push to `main` — the workflow will trigger and publish images to GHCR.

---

## GitOps with ArgoCD

For full GitOps automation, the Kubernetes manifests reference GHCR images directly — no local Docker builds required:

- `ghcr.io/arash00009/greenops-backend:main`
- `ghcr.io/arash00009/greenops-frontend:main`

### Making images accessible from the cluster

Choose one of the following options:

**Option A — Make packages public:**
Go to your GHCR package settings and set visibility to **Public**.

**Option B — Use an image pull secret:**

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-github-pat> \
  -n greenops
```

Then reference `ghcr-secret` in each Deployment under `spec.template.spec.imagePullSecrets`.

---

## Ingress Setup

An Ingress resource is available at `k8s/50_ingress.yaml` for accessing the app via a hostname instead of port-forward.

### Requirements

1. `ingress-nginx` must be installed in the cluster.
2. Add the following entry to your hosts file:

**Windows** (`C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 greenops.local
```

**macOS / Linux** (`/etc/hosts`):
```
127.0.0.1 greenops.local
```

The application will then be reachable at [http://greenops.local](http://greenops.local).

---

## Troubleshooting

### Check pod status

```bash
kubectl -n greenops get pods
```

### View logs per service

```bash
# Backend
kubectl -n greenops logs deploy/greenops-backend

# Frontend
kubectl -n greenops logs deploy/greenops-frontend

# Database
kubectl -n greenops logs deploy/greenops-postgres
```

### Describe a failing pod

```bash
kubectl -n greenops describe pod <pod-name>
```

### Common issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ImagePullBackOff` | GHCR image not accessible | Make package public or add `imagePullSecret` |
| Frontend returns 502 | Backend not ready | Wait for backend pod to reach `Running` state |
| Postgres crash loop | PVC not provisioned | Verify storage class is available in cluster |

---

## Project Structure

```
greenops-api/
├── .github/
│   └── workflows/
│       └── build-and-push-ghcr.yml   # CI/CD pipeline
├── backend/
│   ├── Dockerfile
│   └── ...                           # Node.js/Express API
├── frontend/
│   ├── Dockerfile
│   └── ...                           # Nginx + static HTML/CSS
├── k8s/
│   ├── 00_namespace.yaml
│   ├── 10_postgres.yaml
│   ├── 20_backend.yaml
│   ├── 30_frontend.yaml
│   ├── 40_frontend_proxy.yaml
│   └── 50_ingress.yaml
├── .gitignore
└── README.md
```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/arash00009">arash00009</a></sub>
</div>
