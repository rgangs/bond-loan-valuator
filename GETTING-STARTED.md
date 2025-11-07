# Bond & Loan Portfolio Valuator - Getting Started

Complete setup guide for running the Bond & Loan Portfolio Valuator on your machine.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Git** - [Download Git](https://git-scm.com/downloads)
2. **Node.js 18+** - [Download Node.js](https://nodejs.org/) (LTS version recommended)
3. **PostgreSQL 14+** - [Download PostgreSQL](https://www.postgresql.org/download/)
4. **Python 3.10+** (Optional, for FRED market data) - [Download Python](https://www.python.org/downloads/)

### System Requirements
- **OS:** Windows 10/11, macOS, or Linux
- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 2GB free space

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/rgangs/bond-loan-valuator.git
cd bond-loan-valuator
```

### Step 2: Set Up PostgreSQL Database

1. **Start PostgreSQL service** (if not already running)

2. **Create the database:**
   ```bash
   # Option A: Using psql command line
   psql -U postgres -c "CREATE DATABASE bondvaluator"

   # Option B: Using pgAdmin
   # Open pgAdmin → Right-click Databases → Create → Database
   # Name it "bondvaluator"
   ```

3. **Load the database schema:**
   ```bash
   psql -U postgres -d bondvaluator -f database/schema.sql
   ```

### Step 3: Configure Environment Variables

1. **Navigate to the API server directory:**
   ```bash
   cd api-server
   ```

2. **Copy the example environment file:**
   ```bash
   # Windows (Command Prompt)
   copy .env.example .env

   # Windows (PowerShell)
   Copy-Item .env.example .env

   # macOS/Linux
   cp .env.example .env
   ```

3. **Edit the `.env` file** with your database credentials:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=bondvaluator
   DB_USER=postgres
   DB_PASSWORD=your_password_here

   # JWT Secret (change this to a random string)
   JWT_SECRET=your-super-secret-key-change-this

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # FRED API (Optional - leave as false if not using)
   FRED_API_ENABLED=false
   FRED_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Return to the project root:**
   ```bash
   cd ..
   ```

---

## ▶️ Running the Application

### Method 1: Quick Start (Recommended)

**Single command to run everything:**

```bash
node scripts/dev.js
```

This automated script will:
- ✅ Install all Node.js dependencies for both API and desktop client
- ✅ Verify PostgreSQL database connection
- ✅ Start the API server on `http://localhost:3000`
- ✅ Launch the Electron desktop application
- ✅ Start the FRED API service (if Python is installed)

**Environment Variables (Optional):**
```bash
# Skip FRED API startup
START_FRED=false node scripts/dev.js

# Use custom Python command
PYTHON_COMMAND=python3 node scripts/dev.js

# Point to different FRED API location
FRED_API_PATH=/path/to/fredapi node scripts/dev.js
```

### Method 2: Manual Setup

If you prefer running services separately:

**Terminal 1 - Backend API:**
```bash
cd api-server
npm install
npm run dev
# API will run on http://localhost:3000
```

**Terminal 2 - Desktop Client:**
```bash
cd desktop-client
npm install
npm run dev
# Electron app will launch
```

**Terminal 3 - FRED API (Optional):**
```bash
cd FREDAPI
pip install -r requirements.txt
python main.py
# FRED API will run on http://localhost:8000
```

---

## 🔧 Optional: Enable FRED Market Data

The FRED API provides live Treasury and Corporate yield curve data.

### Setup Steps:

1. **Install Python dependencies:**
   ```bash
   cd FREDAPI
   pip install -r requirements.txt
   ```

2. **Get a FRED API Key** (Free):
   - Visit: https://fred.stlouisfed.org/docs/api/api_key.html
   - Sign up and get your API key

3. **Configure FRED API:**
   ```bash
   # Edit FREDAPI/config.py and add your API key
   FRED_API_KEY = "your_api_key_here"
   ```

4. **Enable FRED in the main app:**

   Edit `api-server/.env`:
   ```env
   FRED_API_ENABLED=true
   FRED_API_BASE_URL=http://localhost:8000/api/v1
   ```

5. **Start FRED API:**
   ```bash
   cd FREDAPI
   python main.py
   ```

**Available Curves:**
- `US_Treasury` - Treasury yield curves
- `US_Corporate_AAA` - AAA corporate bonds
- `US_Corporate_BAA` - BAA corporate bonds
- `US_Corporate_HY` - High yield bonds
- `US_Corporate_Spread_AAA` - AAA spreads
- `US_Corporate_Spread_BAA` - BAA spreads

---

## ✅ Verify Installation

### 1. Check API Health
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","database":"connected"}
```

### 2. Check Desktop App
- The Electron desktop application should launch automatically
- Login screen should appear
- Default credentials (after running seed script):
  - Email: `admin@example.com`
  - Password: `admin123`

### 3. Check FRED API (if enabled)
```bash
curl http://localhost:8000/api/v1/treasury/latest
# Should return JSON with Treasury curve data
```

---

## 📝 Creating Your First User

### Option 1: Use Seed Script (Recommended for Testing)
```bash
cd api-server
node scripts/seed.js
```

This creates:
- Default admin user (admin@example.com / admin123)
- Sample securities, portfolios, and funds
- Test discount curves and FX rates

### Option 2: Manual User Creation
Use the desktop app to register a new user via the signup flow.

---

## 🏗️ Project Structure

```
bond-loan-valuator/
├── api-server/           # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── controllers/ # Business logic
│   │   ├── services/    # Calculation engines
│   │   └── utils/       # Helper functions
│   ├── .env             # Environment config (YOU CREATE THIS)
│   └── package.json
│
├── desktop-client/       # Electron desktop app
│   ├── src/
│   └── package.json
│
├── FREDAPI/              # Python FRED market data service
│   ├── main.py
│   ├── requirements.txt
│   └── config.py
│
├── database/
│   └── schema.sql       # Database schema
│
└── scripts/
    └── dev.js           # Quick start script
```

---

## 🔍 Common Issues & Solutions

### Problem: "Database connection refused"
**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `api-server/.env`
- Ensure database exists: `psql -U postgres -l | grep bondvaluator`

### Problem: "Port 3000 already in use"
**Solution:**
- Change port in `api-server/.env`: `PORT=3001`
- Or kill the process using port 3000:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F

  # macOS/Linux
  lsof -ti:3000 | xargs kill -9
  ```

### Problem: "Cannot find module" errors
**Solution:**
```bash
# Clean install all dependencies
cd api-server
rm -rf node_modules package-lock.json
npm install

cd ../desktop-client
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Python not found" when starting FRED
**Solution:**
- Ensure Python is in your PATH
- Try: `python --version` or `python3 --version`
- Set custom Python: `PYTHON_COMMAND=python3 node scripts/dev.js`
- Or disable FRED: `START_FRED=false node scripts/dev.js`

### Problem: Desktop app shows blank screen
**Solution:**
- Check backend is running: `curl http://localhost:3000/health`
- Check browser console in Electron (View → Toggle Developer Tools)
- Verify API URL in `desktop-client/src/services/apiClient.ts`

---

## 📚 Next Steps

Once installed:

1. **Read the documentation:**
   - [README.md](./README.md) - Project overview
   - [PROGRESS.md](./PROGRESS.md) - Feature status
   - [DEMO-GUIDE.md](./DEMO-GUIDE.md) - Demo walkthrough

2. **Explore the API:**
   - API runs at: `http://localhost:3000`
   - Health check: `http://localhost:3000/health`
   - API documentation: See `README.md` for endpoints

3. **Try the desktop app:**
   - Import securities via CSV
   - Create portfolios and funds
   - Run valuations
   - Export audit reports

---

## 🛠️ Building for Production

### Build Desktop App Installer:
```bash
cd desktop-client
npm run build
```

Installer will be in: `desktop-client/release/`

---

## 💬 Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the [README.md](./README.md) for technical details
3. Check the [GitHub Issues](https://github.com/rgangs/bond-loan-valuator/issues)
4. Contact your implementation team

---

## 📄 License

ISC License - See [LICENSE](./LICENSE) file

---

**Built by:** Claude (Sonnet 4.5)
**Repository:** https://github.com/rgangs/bond-loan-valuator
**Started:** 2025-10-12
**Status:** Production Ready
