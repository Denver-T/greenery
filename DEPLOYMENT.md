# Deployment — Greenery on Azure

Operational reference for the production deployment shipped 2026-04-16.

This doc is for Denver and anyone who needs to poke at the running stack.
It intentionally stays short — long-form context lives in
`.agents/SESSION.md` and `.agents/plans/web-production-deploy-azure.md`.

---

## Hostnames

| What | URL |
|---|---|
| Web (Next.js) | https://greenery-web.azurewebsites.net |
| API (Express) | https://greenery-api.azurewebsites.net |
| API Swagger | https://greenery-api.azurewebsites.net/api-docs |
| API health | https://greenery-api.azurewebsites.net/health |
| API db-health | https://greenery-api.azurewebsites.net/db-health |
| Monday webhook | https://greenery-api.azurewebsites.net/monday/webhook/&lt;secret&gt; |

---

## Azure resources

All in **`greenery-rg`** / **`canadacentral`** on the Azure for Students
subscription (`f708ae83-17fd-40c7-8b01-f9f8ab3b6430`).

| Resource | Type | SKU | Purpose |
|---|---|---|---|
| `greenery-plan` | App Service plan | B1 Linux | hosts both web apps |
| `greenery-api` | App Service | Node 22 LTS | Express API, Always On, health check `/health` |
| `greenery-web` | App Service | Node 22 LTS | Next.js web app, Always On, custom startup command |
| `greenery-mysql-vm` | Virtual machine | Standard_B2pls_v2 (ARM, 2 vCPU, 4 GB, Ubuntu 22.04) | self-installed MySQL 8.0.45 |
| `greenery-mysql-vmNSG` | NSG | — | SSH 22 (open), MySQL 3306 (AzureCloud only) |
| `greenery-mysql-vmPublicIP` | Public IP | Standard, static | `20.104.245.29` |

**Why VM MySQL and not Azure Database for MySQL Flexible Server?** Managed
MySQL is not creatable on the Azure for Students subscription — every region
returns "No available SKUs in this location" regardless of tier/SKU. The VM
with self-installed MySQL is the working fallback.

---

## Cost and credit

Estimated **~$33 USD/month** against the $100 student credit (~3 months runway):
- MySQL VM B2pls_v2 ARM: ~$20/mo Linux pricing
- App Service plan B1 Linux: ~$13/mo
- Static public IP: ~$0.85/mo
- Bandwidth + storage + logging: ~$0.50/mo

### To stop billing

```bash
# Option A: pause compute only (disks still bill a small amount)
az vm deallocate -g greenery-rg -n greenery-mysql-vm
az webapp stop -g greenery-rg -n greenery-api
az webapp stop -g greenery-rg -n greenery-web

# Option B: nuke everything (billing → $0)
az group delete -g greenery-rg --yes --no-wait
```

---

## How to redeploy

Both deploy workflows are `workflow_dispatch`-only (no auto-deploy on push).

```bash
# API only
gh workflow run deploy-api.yml --repo Denver-T/greenery --ref main

# Web only (slower — Next.js build + full node_modules upload)
gh workflow run deploy-web.yml --repo Denver-T/greenery --ref main

# Watch
gh run list --workflow deploy-api.yml --repo Denver-T/greenery --limit 1
gh run watch <run-id> --repo Denver-T/greenery
```

**Cadence:** API deploys ~3–4 min + ~2 min cold start. Web deploys ~10–12 min + ~2 min cold start. Expect a 1–2 min window of 502s on each redeploy — don't redeploy mid-demo.

If the fix commits `f35fc32` and `86ffa4d` haven't been merged into `main` yet, run with `--ref deploy/azure-initial` instead.

---

## App Service env vars

Set on `greenery-api` via `az webapp config appsettings`. Includes:
`NODE_ENV, PORT=8080, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL=false, UPLOAD_DIR=/home/uploads, CORS_ORIGINS, AUTH_PROVIDER, FIREBASE_*, MONDAY_*, WEBSITES_ENABLE_APP_SERVICE_STORAGE=true`

`greenery-web` only has `NODE_ENV` and `PORT=8080` — `NEXT_PUBLIC_*` values are
baked into the client bundle at build time from GitHub Secrets, not App Service
settings.

To update an env var:
```bash
az webapp config appsettings set -g greenery-rg -n greenery-api \
  --settings KEY=value
# Then restart the app so the new value takes effect:
az webapp restart -g greenery-rg -n greenery-api
```

---

## Monday webhook

Registered webhooks (board 8887438729):
- `change_column_value` (id 566754695) → inbound column edits
- `item_deleted` (id 566754711) → inbound row deletions

**Prod webhook secret is separate from the dev secret.** Prod lives in App
Service env vars (`MONDAY_WEBHOOK_SECRET`) and in `.agents/.azure-secrets.local`.
Dev secret lives in `apps/api/.env` and is used with the cloudflared tunnel.

To re-register if the URL ever changes:
```bash
cd apps/api
export MONDAY_WEBHOOK_SECRET=<prod_secret>
node scripts/monday-register-webhook.js --delete-all
node scripts/monday-register-webhook.js --register --url https://greenery-api.azurewebsites.net
```

---

## Connecting to production MySQL

The NSG only allows MySQL traffic from the `AzureCloud` service tag. To query
the DB from your laptop, temporarily add your IP:

```bash
MY_IP=$(curl -s https://ifconfig.me)
az network nsg rule create \
  --resource-group greenery-rg \
  --nsg-name greenery-mysql-vmNSG \
  --name allow-mysql-from-laptop \
  --priority 1110 \
  --direction Inbound --access Allow --protocol Tcp \
  --source-address-prefixes "$MY_IP" \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 3306

# ... do work ...
mysql -u greenery_admin -p -h 20.104.245.29 greenery

# Remove rule when done:
az network nsg rule delete \
  --resource-group greenery-rg \
  --nsg-name greenery-mysql-vmNSG \
  --name allow-mysql-from-laptop
```

---

## SSH to the MySQL VM

```bash
ssh azureuser@20.104.245.29
```

Uses the key at `~/.ssh/id_ed25519`.

---

## Tailing logs

```bash
# API logs (last 30 min)
az webapp log tail -g greenery-rg -n greenery-api

# Download full log archive
az webapp log download -g greenery-rg -n greenery-api --log-file /tmp/apilog.zip

# Web logs
az webapp log tail -g greenery-rg -n greenery-web
```

For the MySQL VM, SSH in and run `sudo journalctl -u mysql -f`.

---

## Known issues (deferred post-launch)

These are logged, not prioritized to block the demo. Fix order and strategy TBD in follow-up sessions.

### Security posture

- **SSH on the MySQL VM is open to the world (0.0.0.0/0 on port 22).** Tightening to Denver's laptop IP only is trivial (`az network nsg rule update`) but skipped pre-launch. Exposed to brute-force login attempts until fixed; the VM only has SSH key auth so the real risk is noisy logs, not compromise.
- **Technician permission level can DELETE work_reqs via the web UI.** The `authorize()` guard on `DELETE /reqs/:id` doesn't require Manager or higher. Mobile is the intended technician surface; the web UI was built for managers/admins, so this is a low-likelihood real-world miss. Fix: add `authorize(["Manager","Administrator","SuperAdmin"])` to the delete route + a regression test.
- **No employee invite flow.** A Firebase sign-in without a matching `employees.email` row returns 401 on every protected endpoint ("auth token missing" in the UI). Current workaround: manually seed both the Firebase Auth user and the `employees` row with the matching email. Option 1 from the post-launch brainstorm (Admin SDK `createUser` + single-transaction `employees` insert) closes this.

### UX

- **Flash of unauthenticated layout shell** on private-window paste of a protected URL. Next.js server-renders the app chrome (nav bar, empty cards) before the client-side auth check runs and redirects. Shell is empty — no actual data leaks, API correctly returns 401 for every unauthenticated call — but the flash looks unpolished. Fix: server-side auth gate via Next.js `middleware.js` that redirects before rendering; requires Firebase ID token verification on the server, ~2 hours of careful work.
- **Dual due-date concepts.** `work_reqs.dueDate` (deadline on the request itself) and `schedule_events.start_time / end_time` (when it's scheduled on the calendar) mean different things semantically but both render on the calendar with no visual distinction. Users reasonably assume they're the same field. Sibling issue to the already-tracked "scheduling ≠ assigning" open thread in `.agents/SESSION.md`. Fix requires a product decision (unify? rename? hide one from calendar view?) plus 2–3 hours of careful implementation across API + web.
- **Assign tasks card pills render as aspect-square ovals.** On the assign tasks page (`apps/web/src/app/(app)/assigntasks/page.js`), the "Magnus Mullen • due Apr 16, 2026" and "Due Apr 16, 2026" badges on each card are rendering as elliptical shapes that wrap text awkwardly — `rounded-full` applied to a container without constrained dimensions inherits its aspect ratio from the text length. Slipped through the earlier design reviews. Fix: swap `rounded-full` → `rounded-lg` on those pills or add a fixed-height container. Small CSS edit.
- **Completed work reqs leak into the Assigned tab** on the assign tasks page. The Assigned filter appears to match `assignedTo IS NOT NULL` rather than `status IN ('assigned','in_progress')` — a completed WR keeps its `assignedTo` FK so it reappears in the filter. Fix: add a status filter on the server-side query or the client-side filter function.

### CI / deploy pipeline

- **Branch `deploy/azure-initial` has 2 commits beyond PR #77 merge** (`f35fc32` + `86ffa4d` — the tailwind lockfile fixes). Until those are PR'd and merged into `main`, every `gh workflow run` must pass `--ref deploy/azure-initial` or the default-main run will pick up the pre-fix workflow file and fail the web build.
- **`rm -f package-lock.json && npm install` in `deploy-web.yml`** loses lockfile determinism on each CI run. Trade-off accepted to work around the Tailwind 4 + npm optional-deps cross-platform bug. Longer-term fix: commit a Linux-specific `package-lock.json` for CI, or add explicit `optionalDependencies` entries in `apps/web/package.json` so the macOS-generated lockfile includes the Linux binaries.
- **`actions/checkout@v4` + `actions/setup-node@v4` run on Node 20**, which GitHub deprecated. Both workflows print a warning every run. GitHub will force Node 24 on 2026-06-02 and remove Node 20 on 2026-09-16 — update the actions before then.

### Operational

- **No backups for MySQL on the VM.** Any corruption or accidental `DROP` is unrecoverable. Acceptable for a 1-week demo; for longer runway, set up a weekly `mysqldump` cron on the VM writing to Azure Blob Storage.
- **App Service uses full `node_modules/` deploy** (not Next.js `output: 'standalone'`). Deploy package is ~100 MB, uploads take 5–10 min, and App Service B1's 1.75 GB RAM is tight during the unpack. Adopting standalone cuts the package to ~20 MB and speeds deploys dramatically — but requires re-jigging `deploy-web.yml` to copy a different set of files and change the startup command. Post-launch polish.

---

## Regenerating the publish profiles

If GitHub Actions deploys start failing with "Publish profile is invalid":

1. Confirm basic auth is still enabled:
   ```bash
   az resource show --resource-group greenery-rg --name scm \
     --namespace Microsoft.Web \
     --resource-type basicPublishingCredentialsPolicies \
     --parent sites/greenery-api \
     --query properties.allow
   ```
   Should return `true`. If `false`, enable:
   ```bash
   az resource update --resource-group greenery-rg --name scm \
     --namespace Microsoft.Web \
     --resource-type basicPublishingCredentialsPolicies \
     --parent sites/greenery-api \
     --set properties.allow=true
   # Repeat for --name ftp and for --parent sites/greenery-web
   ```
2. Re-download and re-set the profiles:
   ```bash
   az webapp deployment list-publishing-profiles -g greenery-rg -n greenery-api --xml \
     | gh secret set AZURE_WEBAPP_PUBLISH_PROFILE_API --repo Denver-T/greenery
   az webapp deployment list-publishing-profiles -g greenery-rg -n greenery-web --xml \
     | gh secret set AZURE_WEBAPP_PUBLISH_PROFILE_WEB --repo Denver-T/greenery
   ```
