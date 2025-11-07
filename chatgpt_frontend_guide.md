# ChatGPT - Frontend Development Instructions

## 🎯 Project: Bond & Loan Portfolio Valuator - Desktop Client

**Repository:** `C:\Users\Ganga\bond-loan-valuator\desktop-client`

**Your Role:** Build the complete Electron desktop application with React UI

**Estimated Time:** 4-6 hours total

---

## 🏗️ Technology Stack

```json
{
  "framework": "Electron",
  "ui": "React 18+ with TypeScript",
  "styling": "Tailwind CSS", 
  "routing": "React Router v6",
  "state": "React Context API + Zustand",
  "forms": "React Hook Form",
  "tables": "TanStack Table",
  "charts": "Recharts",
  "http": "axios",
  "date": "date-fns",
  "file-upload": "react-dropzone"
}
```

---

## 📁 Your Workspace

```
C:\Users\Ganga\bond-loan-valuator\desktop-client\
├── electron\
│   ├── main.js          # YOU BUILD: Electron main process
│   └── preload.js       # YOU BUILD: IPC bridge
├── src\
│   ├── components\      # YOU BUILD: All React components
│   ├── services\        # YOU BUILD: API client
│   ├── context\         # YOU BUILD: State management
│   ├── hooks\           # YOU BUILD: Custom hooks
│   ├── utils\           # YOU BUILD: Helper functions
│   ├── App.tsx          # YOU BUILD: Main app
│   └── index.tsx        # YOU BUILD: Entry point
├── public\
│   └── index.html
└── package.json
```

**DO NOT TOUCH:** `backend/` folder (calculation engines - Claude Code builds this)

---

## 🔗 Backend API (Claude Code is building this)

**Base URL:** `http://localhost:3000/api`

**Authentication:** JWT Bearer token in header after login

---

## 🎨 Your Components to Build

### 📋 Component List (Priority Order)

#### **PHASE 1: Core Structure**

1. **Electron Setup**
   - `electron/main.js` - Window management, menu
   - `electron/preload.js` - Secure IPC bridge
   - Build installer configuration

2. **App Shell**
   - `src/App.tsx` - Main layout, routing
   - `src/components/Layout/Sidebar.tsx` - Navigation menu
   - `src/components/Layout/TopBar.tsx` - User info, logout
   - `src/components/Layout/Breadcrumb.tsx` - Navigation breadcrumbs

3. **Authentication**
   - `src/components/Auth/Login.tsx` - Login form
   - `src/context/AuthContext.tsx` - Auth state management
   - `src/services/apiClient.ts` - Axios setup with interceptors

---

#### **PHASE 2: Hierarchy Management (1.5 hours)**

4. **Fund Manager**
   - `src/components/Funds/FundList.tsx`
     - Table of all funds
     - Search and filter
     - Create/Edit/Delete modals
   - `src/components/Funds/FundForm.tsx`
     - Form: fund_name, base_currency, fund_type

5. **Portfolio Manager**
   - `src/components/Portfolios/PortfolioList.tsx`
     - List portfolios for selected fund
     - Breadcrumb: Fund > Portfolios
     - Create/Edit/Delete
   - `src/components/Portfolios/PortfolioForm.tsx`

6. **Asset Class Manager**
   - `src/components/AssetClasses/AssetClassList.tsx`
     - List asset classes for selected portfolio
     - Breadcrumb: Fund > Portfolio > Asset Classes
     - Create/Edit/Delete
   - `src/components/AssetClasses/AssetClassForm.tsx`

---

#### **PHASE 3: Security Management*

7. **Security List**
   - `src/components/Securities/SecurityList.tsx`
     - Table with columns: Name, ISIN, Type, Currency, Maturity, Status
     - Filters: by type, currency, status
     - Search by name/ISIN
     - Click row → opens Security Overview page
     - Status badges: Active (green), Defaulted (red), Sold (gray), Transferred (blue)

8. **CSV/Excel Upload** ⚠️ **IMPORTANT**
   - `src/components/Upload/FileUpload.tsx`
     - Drag-and-drop zone (react-dropzone)
     - Accept .csv, .xlsx, .xls files
     - Preview first 10 rows
     - "Validate" button → shows errors
     - Error display: Table with line numbers, field names, error messages
     - "Import" button (only enabled after validation passes)
     - Progress bar during import
   
   **Excel Format Users Upload:**
   ```
   Headers (ALL required):
   - security_name
   - isin (or cusip)
   - instrument_type (bond_fixed, bond_floating, bond_zero, bond_inflation_linked, bond_step_up, loan_term, loan_amortizing, etc.)
   - currency
   - issuer_name
   - coupon
   - coupon_freq (ANNUAL, SEMI, QUARTERLY, MONTHLY, ZERO)
   - day_count (30/360, ACT/360, ACT/ACT, ACT/365)
   - issue_date (YYYY-MM-DD)
   - maturity_date (YYYY-MM-DD)
   - face_value
   - quantity
   - book_value
   
   Optional columns:
   - reference_rate (for floaters: SOFR, LIBOR, etc.)
   - spread (for floaters)
   - floor, cap (for floaters)
   - inflation_index (for inflation-linked)
   - step_schedule (JSON string for step-up bonds)
   - amort_schedule (JSON string for amortizing loans)
   - credit_rating
   - sector
   - country
   ```

9. **Security Form (In-App Edit)**
   - `src/components/Securities/SecurityForm.tsx`
     - Full form with ALL fields from security_master
     - Dynamic fields based on instrument_type:
       - Fixed bond: coupon, coupon_freq, day_count
       - Floater: reference_rate, spread, floor, cap, reset_freq
       - Inflation-linked: inflation_index, index_base_value
       - Step-up: step_schedule builder (add/remove steps)
       - Amortizing loan: amortization schedule builder
     - Validation
     - Save updates to database

---

#### **PHASE 4: Security Overview Page** ⚠️ **NEW REQUIREMENT**

10. **Security Overview** (Think Bloomberg Terminal)
    - `src/components/Securities/SecurityOverview.tsx`
      
      **Layout:**
      ```
      ┌─────────────────────────────────────────────────────────────┐
      │  Security Name                          Status: [Active]     │
      │  ISIN: US037833100                      Last Updated: [date] │
      ├─────────────────────────────────────────────────────────────┤
      │                                                               │
      │  📊 Summary Cards (4 columns):                               │
      │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
      │  │Fair Value│ │Book Value│ │ Unr. G/L │ │   YTM    │       │
      │  │ $492,350 │ │ $485,000 │ │  $7,350  │ │  4.72%   │       │
      │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
      │                                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  📝 Tabs:                                                    │
      │  [Details] [Cash Flows] [Valuations] [Performance]          │
      │                                                               │
      │  TAB: Details                                                │
      │  ┌─────────────────────────────────────────────────────┐   │
      │  │ Instrument Type:    Fixed Rate Bond                   │   │
      │  │ Currency:           USD                               │   │
      │  │ Issuer:             Apple Inc                         │   │
      │  │ Coupon:             4.5%                              │   │
      │  │ Coupon Frequency:   Semi-Annual                       │   │
      │  │ Day Count:          30/360                            │   │
      │  │ Issue Date:         2015-06-15                        │   │
      │  │ Maturity Date:      2035-06-15                        │   │
      │  │ Face Value:         $1,000,000                        │   │
      │  │ ... (all other fields)                                │   │
      │  │                                                         │   │
      │  │ [Edit Security] [View Full Details]                   │   │
      │  └─────────────────────────────────────────────────────┘   │
      │                                                               │
      │  TAB: Cash Flows → see next component                        │
      │  TAB: Valuations → Price history chart + table               │
      │  TAB: Performance → Duration, Convexity, Spreads             │
      │                                                               │
      └─────────────────────────────────────────────────────────────┘
      ```

---

#### **PHASE 5: Cash Flow Projection & Management** ⚠️ **NEW REQUIREMENT**

11. **Project Cash Flows UI**
    - `src/components/CashFlows/CashFlowProjection.tsx`
      
      **Button in Security Overview:**
      - `[Project Cash Flows]` button
      - Calls `GET /api/cashflows/:security_id/project`
      - Opens modal or new page
      
      **Display:**
      ```
      ┌─────────────────────────────────────────────────────────────┐
      │  Cash Flows - Apple Inc 4.5% 2035                           │
      ├─────────────────────────────────────────────────────────────┤
      │  Total Cash Flows: 42                                        │
      │  Past (Realized): 8 | Future (Projected): 34                │
      │  Defaulted: 1                                                │
      ├─────────────────────────────────────────────────────────────┤
      │                                                               │
      │  ⬇️ PAST CASH FLOWS                                          │
      │  ┌─────────┬─────────┬────────┬─────────┬──────────────┐   │
      │  │  Date   │ Amount  │  Type  │ Status  │   Actions    │   │
      │  ├─────────┼─────────┼────────┼─────────┼──────────────┤   │
      │  │06/15/23 │$22,500  │Coupon  │ Paid ✓  │              │   │
      │  │12/15/23 │$22,500  │Coupon  │Default❌│[View Details]│   │
      │  │06/15/24 │$22,500  │Coupon  │ Paid ✓  │              │   │
      │  │12/15/24 │$22,500  │Coupon  │ Paid ✓  │              │   │
      │  └─────────┴─────────┴────────┴─────────┴──────────────┘   │
      │                                                               │
      │  ⬆️ FUTURE CASH FLOWS                                        │
      │  ┌─────────┬─────────┬────────┬──────────┐                 │
      │  │  Date   │ Amount  │  Type  │ Status   │                 │
      │  ├─────────┼─────────┼────────┼──────────┤                 │
      │  │06/15/25 │$22,500  │Coupon  │Projected │                 │
      │  │12/15/25 │$22,500  │Coupon  │Projected │                 │
      │  │06/15/26 │$22,500  │Coupon  │Projected │                 │
      │  │...                                     │                 │
      │  │06/15/35 │$1,022,500│Redemp│Projected │                 │
      │  └─────────┴─────────┴────────┴──────────┘                 │
      │                                                               │
      │  [Export to Excel] [Download CSV]                            │
      └─────────────────────────────────────────────────────────────┘
      ```

12. **Mark Cash Flow as Default**
    - `src/components/CashFlows/MarkDefaultModal.tsx`
    - Triggered when user clicks on a past cash flow
    - Form:
      - Default Date (date picker)
      - Recovery Amount (optional, number input)
      - Notes (textarea)
    - Calls `PUT /api/cashflows/:cash_flow_id/mark-default`
    - Updates UI to show ❌ default status
    - Shows recovery amount if any

13. **Security Status Manager**
    - `src/components/Securities/SecurityStatusForm.tsx`
    - In Security Overview page
    - Dropdown: Active | Sold | Defaulted | Transferred | Matured
    - If "Transferred": Show target portfolio selector
    - If "Sold": Show sale date and amount
    - If "Defaulted": Show default date
    - Calls `PUT /api/positions/:position_id`

---

#### **PHASE 6: Valuation Runner **

14. **Valuation Setup Page**
    - `src/components/Valuations/ValuationSetup.tsx`
      
      **UI Flow:**
      ```
      ┌─────────────────────────────────────────────────────────────┐
      │  Run Valuation                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  Step 1: Select Scope                                        │
      │  ○ Single Instrument  ○ Portfolio  ○ Fund                   │
      │                                                               │
      │  [Dropdown: Select instrument/portfolio/fund]                │
      │                                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  Step 2: Valuation Date                                      │
      │  [Date Picker: 2025-10-12]                                  │
      │                                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  Step 3: Configure Discount Curves                           │
      │  (Shows table of securities in scope)                        │
      │                                                               │
      │  ┌────────────┬──────────┬────────────┬─────────┐           │
      │  │ Security   │ Currency │ Base Curve │ Spread  │           │
      │  ├────────────┼──────────┼────────────┼─────────┤           │
      │  │ AAPL 4.5%  │ USD      │ [Dropdown] │ [+150]  │           │
      │  │ TSLA 5.0%  │ USD      │ [Dropdown] │ [+200]  │           │
      │  │ BMW 3.5%   │ EUR      │ [Dropdown] │ [+100]  │           │
      │  └────────────┴──────────┴────────────┴─────────┘           │
      │                                                               │
      │  ⚠️ Curve Dropdown dynamically populated from:              │
      │     GET /api/curves/library                                  │
      │     (shows curves from Bloomberg PORT or configured source)  │
      │                                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  [Preview Curves] [Run Valuation]                            │
      └─────────────────────────────────────────────────────────────┘
      ```

15. **Curve Selector Component** ⚠️ **CRITICAL**
    - `src/components/Valuations/CurveSelector.tsx`
    - **MUST fetch curves dynamically** - DO NOT hardcode
    - On mount: Call `GET /api/curves/library`
    - Dropdown populated with response
    - When user selects curve, optionally preview recent rates
    - Manual spread input (in basis points)
    
    ```typescript
    // CORRECT implementation
    useEffect(() => {
      apiClient.get('/api/curves/library')
        .then(res => setCurveOptions(res.data))
        .catch(err => console.error(err));
    }, []);
    
    // Render
    <select value={selectedCurve} onChange={handleChange}>
      <option value="">-- Select Curve --</option>
      {curveOptions.map(curve => (
        <option key={curve.name} value={curve.name}>
          {curve.name} - {curve.description}
        </option>
      ))}
    </select>
    ```

16. **Valuation Progress**
    - `src/components/Valuations/ValuationProgress.tsx`
    - After user clicks "Run Valuation"
    - Shows progress bar
    - Poll `GET /api/valuations/:run_id` every 2 seconds
    - Display: "Valuing 15 of 50 securities (30%)"
    - Show completion message
    - Button: "View Results"

---

#### **PHASE 7: Results & Reporting **

17. **Results Dashboard**
    - `src/components/Results/ResultsDashboard.tsx`
      
      **Layout:**
      ```
      ┌─────────────────────────────────────────────────────────────┐
      │  Valuation Results - October 12, 2025                       │
      ├─────────────────────────────────────────────────────────────┤
      │  📊 Summary Cards:                                          │
      │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
      │  │Portfolio Value│ │  Fair Value  │ │ Unrealized G/L│       │
      │  │  $48,500,000  │ │ $49,235,000  │ │   $735,000   │       │
      │  └──────────────┘ └──────────────┘ └──────────────┘       │
      │                                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  📈 Charts:                                                  │
      │  [Pie Chart: Value by Asset Class] [Bar: Top 10 Holdings]  │
      │                                                               │
      ├─────────────────────────────────────────────────────────────┤
      │  📋 Results Table:                                          │
      │  ┌────────┬───────┬────────┬──────────┬────────┬─────────┐│
      │  │Security│ Book  │  Fair  │   G/L    │ % Chg  │ Actions ││
      │  ├────────┼───────┼────────┼──────────┼────────┼─────────┤│
      │  │AAPL 4.5│485,000│492,350 │  +7,350  │ +1.52% │[Details]││
      │  │TSLA 5.0│520,000│518,200 │  -1,800  │ -0.35% │[Details]││
      │  │BMW 3.5 │380,000│395,600 │ +15,600  │ +4.11% │[Details]││
      │  └────────┴───────┴────────┴──────────┴────────┴─────────┘│
      │                                                               │
      │  Filters: [Asset Class ▼] [Currency ▼] [Sort by: G/L ▼]   │
      │  [Export CSV] [Export Excel] [Print Report]                 │
      └─────────────────────────────────────────────────────────────┘
      ```

18. **Audit Trail Viewer**
    - `src/components/Audit/AuditTrail.tsx`
    - Accessed by clicking [Details] in Results Table
    - Calls `GET /api/audit/report?security_id=...&valuation_run_id=...`
    - Shows tabs:
      - **Summary**: Fair value breakdown
      - **Cash Flows**: Table of all cash flows used
      - **Discount Rates**: Curve data + spreads
      - **DCF Waterfall**: Detailed PV calculation for each CF
      - **Adjustments**: Any IFRS adjustments
    - Button: "Download Excel Report"
    - Downloads from `GET /api/audit/excel?security_id=...&valuation_run_id=...`

19. **Analytics Dashboard**
    - `src/components/Analytics/AnalyticsDashboard.tsx`
    - IFRS 13 Fair Value Hierarchy:
      - Pie chart: % of portfolio in Level 1, 2, 3
      - Table breakdown by security
    - Duration & Convexity metrics
    - Concentration analysis:
      - Top issuers
      - Sector breakdown
      - Currency exposure
    - Sensitivity analysis:
      - Rate shock scenarios (+50bps, +100bps, +200bps)
      - Impact on portfolio value

---

## 🔧 Technical Implementation

### API Client Setup

```typescript
// src/services/apiClient.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const fundsAPI = {
  getAll: () => apiClient.get('/funds'),
  getById: (id: string) => apiClient.get(`/funds/${id}`),
  create: (data: any) => apiClient.post('/funds', data),
  update: (id: string, data: any) => apiClient.put(`/funds/${id}`, data),
  delete: (id: string) => apiClient.delete(`/funds/${id}`),
};

export const securitiesAPI = {
  getAll: (assetClassId: string) => 
    apiClient.get(`/securities?asset_class_id=${assetClassId}`),
  getById: (id: string) => apiClient.get(`/securities/${id}`),
  getOverview: (id: string) => apiClient.get(`/overview/${id}`),
  create: (data: any) => apiClient.post('/securities', data),
  update: (id: string, data: any) => apiClient.put(`/securities/${id}`, data),
  delete: (id: string) => apiClient.delete(`/securities/${id}`),
};

export const cashflowAPI = {
  project: (securityId: string) => 
    apiClient.get(`/cashflows/${securityId}/project`),
  markDefault: (flowId: string, data: any) => 
    apiClient.put(`/cashflows/${flowId}/mark-default`, data),
  markPaid: (flowId: string, data: any) => 
    apiClient.put(`/cashflows/${flowId}/mark-paid`, data),
};

export const valuationAPI = {
  run: (data: any) => apiClient.post('/valuations/run', data),
  getStatus: (runId: string) => apiClient.get(`/valuations/${runId}`),
  getResults: (runId: string) => apiClient.get(`/valuations/${runId}/results`),
};

export const curveAPI = {
  getLibrary: () => apiClient.get('/curves/library'),
  fetch: (name: string, date: string) => 
    apiClient.get(`/curves/fetch?name=${name}&date=${date}`),
};

export const auditAPI = {
  getReport: (securityId: string, runId: string) => 
    apiClient.get(`/audit/report?security_id=${securityId}&valuation_run_id=${runId}`),
  downloadExcel: (securityId: string, runId: string) => 
    apiClient.get(`/audit/excel?security_id=${securityId}&valuation_run_id=${runId}`, {
      responseType: 'blob'
    }),
};
```

---

### State Management

```typescript
// src/context/AuthContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('auth_token')
  );

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token, user } = response.data;
    setToken(token);
    setUser(user);
    localStorage.setItem('auth_token', token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

```typescript
// src/context/AppContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface AppContextType {
  selectedFund: Fund | null;
  selectedPortfolio: Portfolio | null;
  selectedAssetClass: AssetClass | null;
  setSelectedFund: (fund: Fund | null) => void;
  setSelectedPortfolio: (portfolio: Portfolio | null) => void;
  setSelectedAssetClass: (assetClass: AssetClass | null) => void;
}

// Implementation similar to AuthContext
```

---

### Custom Hooks

```typescript
// src/hooks/useAsync.ts
import { useState, useEffect } from 'react';

export function useAsync<T>(asyncFunction: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    asyncFunction()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, dependencies);

  return { data, loading, error };
}
```

---

### Error Handling Pattern

Every component should handle loading and error states:

```typescript
function SecurityList() {
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    securitiesAPI.getAll(assetClassId)
      .then(res => setSecurities(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [assetClassId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorAlert message={error} />;
  
  return <Table data={securities} />;
}
```

---

## 🎨 UI/UX Guidelines

### Design Principles
1. **Professional Financial UI**: Think Bloomberg Terminal, not consumer app
2. **Data Density**: Show lots of information efficiently
3. **Fast Navigation**: Minimal clicks to get to data
4. **Clear Visual Hierarchy**: Important info stands out
5. **Status Indicators**: Use colors meaningfully
   - Green: Positive, active, paid
   - Red: Negative, defaulted, error
   - Gray: Inactive, neutral
   - Blue: Informational, transferred
6. **Responsive Tables**: Sortable, filterable, searchable
7. **Loading States**: Always show spinners during API calls
8. **Error Messages**: User-friendly, actionable

### Component Styling with Tailwind

```typescript
// Card component
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-semibold mb-4">Title</h2>
  <p className="text-gray-600">Content</p>
</div>

// Status badge
<span className={`px-2 py-1 rounded-full text-sm font-medium ${
  status === 'active' ? 'bg-green-100 text-green-800' :
  status === 'defaulted' ? 'bg-red-100 text-red-800' :
  'bg-gray-100 text-gray-800'
}`}>
  {status}
</span>

// Button
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
  Submit
</button>
```

---

## 📦 Dependencies to Install

```bash
cd desktop-client

# Core
npm install react react-dom react-router-dom
npm install electron electron-is-dev

# UI & Forms
npm install @headlessui/react @heroicons/react
npm install react-hook-form zod @hookform/resolvers
npm install react-dropzone

# Tables & Charts
npm install @tanstack/react-table
npm install recharts

# HTTP & Utils
npm install axios
npm install date-fns
npm install clsx

# Dev Dependencies
npm install --save-dev @vitejs/plugin-react vite typescript
npm install --save-dev @types/react @types/react-dom @types/node
npm install --save-dev electron-builder concurrently
npm install --save-dev tailwindcss postcss autoprefixer
```

---

## 🚀 Build Order 

### 1: Setup & Auth
1. Set up Electron + React + Vite
2. Configure Tailwind CSS
3. Build login screen
4. Set up routing
5. Create API client with interceptors

### 2: Hierarchy UI
6. Build Fund Manager (list, create, edit, delete)
7. Build Portfolio Manager
8. Build Asset Class Manager
9. Add navigation breadcrumbs

### 3: Securities & Upload
10. Build Security List with filters
11. Build CSV/Excel upload with validation
12. Build Security Form (dynamic fields)

### 4: Security Overview & Cash Flows
13. Build Security Overview page (Bloomberg-style)
14. Build Cash Flow Projection UI
15. Build Mark Default modal
16. Add status management

###  5: Valuation
17. Build Valuation Setup page
18. Build Curve Selector (dynamic from API)
19. Build Progress tracker
20. Handle valuation run flow

###  6: Results & Polish
21. Build Results Dashboard with charts
22. Build Audit Trail viewer
23. Add Excel download functionality
24. Polish UI/UX, fix bugs

---

## ⚠️ Critical Requirements

1. **Curve Selection MUST be Dynamic**
   - DO NOT hardcode curve names
   - MUST call GET /api/curves/library on mount
   - Dropdown populated from API response

2. **Excel Upload MUST Include All Fields**
   - Users provide complete security details in Excel
   - All fields from security_master table
   - Validate thoroughly before import

3. **Cash Flow Projection is Key Feature**
   - Must show ALL cash flows (past and future)
   - Allow marking defaults on past flows
   - Clear visual distinction between past/future

4. **Security Overview = Bloomberg Style**
   - Complete security details
   - Price history
   - Performance metrics
   - All in one page

5. **Status Management**
   - Users can mark securities as: active, sold, defaulted, transferred
   - Track transfer details, sale details, default details

6. **Error Handling**
   - Every API call wrapped in try-catch
   - Show user-friendly error messages
   - Never show raw error stack to users

7. **Loading States**
   - Show spinners during all async operations
   - Disable buttons during submission
   - Progress bars for long operations

---

## 🧪 Testing Checklist

Before calling a feature "done", test:

✅ Loading states work
✅ Error states display properly
✅ Empty states (no data) handled
✅ Forms validate correctly
✅ API calls succeed/fail gracefully
✅ Navigation works (breadcrumbs, back buttons)
✅ Tables sort and filter
✅ Charts render with real data
✅ Excel/CSV download works
✅ Responsive on different screen sizes

---

## 📞 Coordination with Backend

**Backend (Claude Code) is building:**
- Database schema
- All API endpoints
- Calculation engines
- External integrations

**You are building:**
- All UI components
- Forms and validation (client-side)
- API client and state management
- Charts and visualizations

**Shared:**
- TypeScript types in `shared/types/index.ts`
- API contract (documented above)

**Communication:**
- User will relay any issues between us
- If API endpoint missing, user requests it from backend
- If UI component missing, user requests it from you

---

**READY TO BUILD!** Start with Phase 1 (setup) and work systematically through each phase. Total time: 1-2hrs.