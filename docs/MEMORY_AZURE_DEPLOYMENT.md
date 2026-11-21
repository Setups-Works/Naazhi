# Naazhi AI Semantic Memory — Azure Deployment Preparation Guide

> **IMPORTANT:** This document provides architecture planning and deployment guidelines. As specified in project rules, **do not automatically create Azure resources or alter existing production Azure configurations without explicit approval.**

---

## 1. Architecture Overview

In production, the current **Azure App Service** and custom domain configuration remain completely unchanged.

ChromaDB requires persistent storage for its SQLite metadata and HNSW vector indices (`chromadata`). Because Azure App Service containers run on ephemeral local disks (or latency-sensitive Azure Files SMB shares that are unsuitable for high-IOPS vector indexing), ChromaDB must run on a dedicated persistent container host:

```
[ Azure App Service (Next.js 16) ]
               │
               ▼  (Private VNet Integration / Mutual TLS Bearer Token)
[ Azure Container Apps / Dedicated Linux VM ]
       ├── Chroma Auth Gateway (Nginx reverse proxy, TLS, Bearer token check)
       └── ChromaDB Server (v1.5.9, listening on internal network only)
               │
               ▼
[ Azure Premium Managed Disk / Persistent Azure Disk Volume (/data) ]
```

---

## 2. Infrastructure Requirements

### Host Options

1. **Recommended: Azure Container Apps (with Dedicated Workload Profile)**
   - Environment connected to the App Service VNet.
   - Dedicated persistent volume backed by Azure Managed Disk.
   - Container ingress set to **Internal Only** (private VNet IP address).

2. **Alternative: B2s/D2s Linux VM with Docker Compose**
   - Host running Ubuntu 24.04 LTS.
   - Attached 32 GB Premium SSD Managed Disk (`/dev/sdc` mounted to `/var/lib/chromadata`).
   - Network Security Group (NSG) restricted to inbound port 8000 from App Service subnet only.

### Resource Sizing

- **ChromaDB Host:**
  - 2 vCPU, 4 GB - 8 GB RAM.
  - Disk: 32 GB Premium SSD (P4/P6) formatted with ext4.
- **Next.js App Service:**
  - Embeddings are computed locally on Node.js using `xenova/multilingual-e5-small` (CPU inference with ONNX Runtime web / quantised q8).
  - Memory footprint: ~150 MB per worker process for model weights.

---

## 3. Required App Service Environment Variables

Configure these app settings in Azure App Service Configuration:

| Variable | Description | Example / Destination |
| :--- | :--- | :--- |
| `CHROMA_URL` | Private URL of Chroma Auth Gateway | `http://chroma-internal.internal.vnet:8000` |
| `CHROMA_AUTH_TOKEN` | Secret Bearer Token matching gateway config | Long random hex string (`openssl rand -hex 32`) |
| `CHROMA_COLLECTION` | ChromaDB collection name | `naazhi_conversation_memories` |
| `CRON_SECRET` | Secret token for triggering indexing queue | Long random hex string |

---

## 4. Private Networking Configuration

1. **VNet Integration:** Enable regional VNet integration on the Azure App Service.
2. **Private DNS / Ingress:** The Chroma host must bind to a private VNet IP or private DNS zone.
3. **No Public Ingress:** Public access to ChromaDB port 8000 must be blocked by Network Security Groups (NSG) and Azure firewall rules.

---

## 5. Persistent Storage & Backup Strategy

- **Storage Volume:** Mount durable disk at `/data` inside the ChromaDB container.
- **Snapshot Backup:**
  - Configure daily Azure Managed Disk Snapshots with a 14-day retention policy.
  - Automated script triggers snapshot during off-peak hours (e.g. 02:00 UTC).
- **Restore Procedure:**
  1. Stop Chroma container service.
  2. Create new disk from point-in-time snapshot.
  3. Swap disk attachment and restart Chroma container.
  4. Run `chromaHealthCheck` to confirm index integrity.

---

## 6. Health Checks & Monitoring

- **App Service Health Endpoint:** `/api/v1/memory/health` probes `chromaHealthCheck()`.
- **Azure Monitor Alerts:**
  - Alert on HTTP 5xx responses from Chroma Auth gateway.
  - Alert on Managed Disk IOPS throttling or free disk space `< 20%`.
  - Alert on `memory_indexing_outbox` pending rows exceeding 100 for more than 30 minutes.

---

## 7. Rollback & Disaster Recovery

- If ChromaDB is temporarily unreachable, Naazhi's chat pipeline **automatically falls back to standard chat without memory**. Chat streaming is never interrupted.
- To disable memory globally in an emergency without redeploying code, unset `CHROMA_URL` in App Service settings or set `CHROMA_AUTH_TOKEN` to an empty string.
