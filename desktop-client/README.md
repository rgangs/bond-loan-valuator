 
# Bond & Loan Portfolio Valuator - Desktop Client

Electron + React (Vite + TypeScript) desktop UI for managing bond and loan portfolios. The current milestone delivers live-backed dashboards, CRUD views, valuation execution, and audit inspection against the Node/Express API.

## Key Features (Current Sprint)

- Electron main process with secure preload bridge and Vite renderer.
- JWT authentication with persisted session (talking to `/api/auth`).
- Live dashboard surfacing funds, portfolios, securities, and audit activity.
- Fund, portfolio, and security management views wired to the backend APIs.
- Valuation launcher supporting security/portfolio/fund runs with concurrency controls.
- Results page with security overview, metrics, price history, and audit export.

## Getting Started

```bash
npm install
npm run dev
```

- `npm run dev` launches Vite (renderer) and Electron simultaneously. The renderer is also available in the browser at `http://localhost:5173`.
- Authentication is currently disabled for the demo build; the UI connects directly to the backend endpoints.

## Available Scripts

- `npm run dev` – Develop with hot reload (Electron + Vite).
- `npm run renderer` – Run the Vite dev server without Electron.
- `npm run electron` – Start Electron against the current renderer target.
- `npm run build` – Create a production build (renderer + electron-builder packaging).
- `npm run preview` – Preview the built renderer in a browser.
- `npm run lint` / `npm run typecheck` – Static analysis helpers.

## Directory Layout

```
desktop-client/
├── electron/           # Main & preload scripts for Electron
├── src/
│   ├── components/     # Layout, dashboard, detail components
│   ├── context/        # Progress state store
│   ├── hooks/          # API hooks
│   ├── pages/          # Route-level components backed by API
│   ├── services/       # HTTP client configuration
│   └── styles/         # Tailwind entry point
└── index.html          # Vite entry
```

## Progress Dashboard

The landing page (`/`) presents a progress tracker aligned with the build guide. Task statuses can be updated inline (Pending / In Progress / Complete / Blocked) to keep the roadmap in sync while implementing features.

## Packaging Note

`npm run build` will output the renderer bundle (`dist/`) and invoke `electron-builder` using the defaults. Configure distributables (e.g., Windows NSIS installer) via `electron-builder` options before shipping.
