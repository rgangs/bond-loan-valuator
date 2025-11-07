## Bond & Loan Valuator - Client Installation

This zip contains both the backend API and the Electron desktop client needed to run the Bond & Loan Portfolio Valuator.

### 1. Prerequisites
- Windows 10/11 64-bit
- Node.js 20 LTS or newer (https://nodejs.org)
- npm 9+ (bundled with Node.js)
- PostgreSQL 14+ with a database user that can create tables

> Optional (for live FRED yield curves): Python 3.10+, Git, and the companion FRED API service (`FREDAPI` directory supplied separately).

### 2. Unpack the Bundle
1. Unzip `bond-loan-valuator-client.zip` somewhere writeable, e.g. `C:\BondLoanValuator`.
2. All commands below assume you are inside that folder in a terminal (`PowerShell` or `cmd`).

### 3. Environment Configuration
1. Copy `api-server/.env.example` to `api-server/.env`.
2. Update the following keys inside `api-server/.env`:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` – point to your PostgreSQL instance.
   - `JWT_SECRET` – set to a long random string.
   - `FRED_API_ENABLED` (optional) – `true` to fetch curves from the external FRED service; set `FRED_API_BASE_URL` accordingly.
3. If the backend runs somewhere other than `http://localhost:3000`, edit `desktop-client/src/services/apiClient.ts` and update `API_BASE_URL`.

### 4. Install Dependencies
```powershell
# Backend dependencies
cd api-server
npm install

# Desktop client dependencies
cd ..\desktop-client
npm install
```

### 5. Database Setup
```powershell
cd ..\database
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME> -f schema.sql
cd ..
```
Seed data scripts live in `database/seeds/`. Run whichever files you need after the schema is loaded.

### 6. Optional: Local FRED Curve Service
1. Clone or copy the separate FRED API bundle into `FREDAPI/`.
2. Follow the instructions in `FREDAPI/README.md` to install requirements and start the service.
3. Set `FRED_API_ENABLED=true` and `FRED_API_BASE_URL=http://localhost:8000/api/v1` in `api-server/.env`.

### 7. Build the Desktop Client (Backend Included)
```powershell
cd desktop-client
npm run build   # Builds the renderer bundle and packages Electron with the backend
```
The build drops artifacts into `desktop-client\release\`. The Windows installer is under `release\Bond & Loan Valuator Setup x64.exe`; running it installs an app that automatically starts the bundled API server when launched.

On first launch the app looks for `api-server\.env` next to its installed resources—copy your configured `.env` into `C:\Program Files\Bond & Loan Valuator\resources\app-backend\api-server\.env` (or the custom install path you choose). Without a valid `.env`, the backend will exit immediately.

### 8. Optional: Manual Backend Run
If you want to test the backend separately before packaging:
```powershell
cd api-server
npm run start
```
The API listens on `http://localhost:3000` by default. Confirm the health endpoint: `http://localhost:3000/health`.

### 9. Packaging Notes
- The `release/` folder contains both `win-unpacked` (portable folder with the `.exe`) and the NSIS installer (`Bond & Loan Valuator Setup x64.exe`).
- To rebuild quickly after code changes, clean `desktop-client\dist` and rerun `npm run build`.

### 10. Troubleshooting
- Backend failing to start with `ECONNREFUSED`: check PostgreSQL credentials and firewall.
- Desktop blank screen: ensure backend is reachable at the URL defined by `API_BASE_URL` in `desktop-client/src/services/apiClient.ts`.
- FRED curve fetch errors: verify the FRED service is running and the environment variables point to the correct base URL.

For further assistance, contact your implementation team lead.
