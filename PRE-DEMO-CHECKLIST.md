# Pre-Demo Checklist - Bond & Loan Valuator

## ✅ 5-Minute Pre-Flight Check

Run this checklist **before** your client demo to ensure everything works smoothly.

---

## 1. Database Setup ✓

### Check PostgreSQL is Running
```bash
pg_isready
```
**Expected:** `accepting connections`

### Verify Database Exists
```bash
psql -l | grep bondvaluator
```

### If Database Doesn't Exist:
```bash
createdb bondvaluator
psql -d bondvaluator -f database/schema.sql
cd api-server
node scripts/seed.js
```

### Test Database Connection
```bash
psql -d bondvaluator -c "SELECT COUNT(*) FROM users;"
```
**Expected:** At least 1 row (admin user)

---

## 2. Backend API Server ✓

### Navigate to API Directory
```bash
cd api-server
```

### Check .env File Exists
```bash
ls -la .env
```

### If Missing, Create It:
```bash
cp .env.example .env
# Edit DB credentials if needed
```

### Install Dependencies (if needed)
```bash
npm install
```

### Start Backend Server
```bash
npm run dev
```

**Expected Output:**
```
✅ Database connected successfully
🚀 Server running on http://localhost:3000
```

### Test Backend (in new terminal)
```bash
curl http://localhost:3000/api/health
```
**Expected:** `{"status":"ok"}`

---

## 3. Desktop Client ✓

### Navigate to Desktop Client Directory
```bash
cd desktop-client
```

### Install Dependencies (if needed)
```bash
npm install
```

### Start Desktop Client
```bash
npm run dev
```

**Expected:** Electron app launches automatically

---

## 4. Test Login ✓

1. App should show login screen
2. Use default credentials:
   - **Email:** `admin@bondvaluator.com`
   - **Password:** `Admin123!`
3. Click **Login**
4. Should redirect to **Dashboard**

**If login fails:**
- Check backend is running (`http://localhost:3000`)
- Check database has seeded user (run seed script)

---

## 5. Verify Sample Data ✓

### Check Sample Excel File Exists
```bash
ls -la sample-bonds-upload.xlsx
```

**If missing:**
```bash
node scripts/generate-sample-data.js
```

### Verify File Contents
- Should contain 5 bonds
- Different instrument types (fixed, zero, floating)
- Valid ISINs and CUSIPs

---

## 6. Quick Feature Test ✓

### Dashboard
- [ ] Shows counts for Funds, Portfolios, Securities
- [ ] No error messages
- [ ] Clean UI (no progress bars or "pending" indicators)

### Funds Page
- [ ] Can view list
- [ ] Can create new fund
- [ ] Can edit/delete fund

### Upload Page
- [ ] Can drag-and-drop Excel file
- [ ] Validation works
- [ ] Import succeeds

### Valuation Page
- [ ] Can select run type
- [ ] Can configure options
- [ ] Run button works

### Results Page
- [ ] Shows results table
- [ ] Can export to Excel

---

## 7. Common Issues & Fixes

### ❌ "Database connection failed"
**Fix:**
```bash
# Check PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql  # Mac
# Windows: Start PostgreSQL from Services

# Verify .env has correct credentials
cat api-server/.env | grep DB_
```

### ❌ "Port 3000 already in use"
**Fix:**
```bash
# Find process
lsof -ti:3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill it
kill -9 <PID>
```

### ❌ Electron app won't start
**Fix:**
```bash
cd desktop-client
rm -rf node_modules
npm install
npm run dev
```

### ❌ Upload fails
**Fix:**
```bash
# Ensure directories exist
mkdir -p api-server/uploads
mkdir -p api-server/exports
```

### ❌ No data showing in app
**Fix:**
```bash
# Re-run seed script
cd api-server
node scripts/seed.js
```

---

## 8. Performance Check ✓

### Backend Response Time
```bash
time curl http://localhost:3000/api/funds
```
**Expected:** < 200ms

### Memory Usage
```bash
# Check backend isn't leaking memory
ps aux | grep node
```

---

## 9. Demo Data Preparation

### Option A: Use Seed Data (Fastest - 30 seconds)
```bash
cd api-server
node scripts/seed.js
```

**This creates:**
- 3 funds
- 4 portfolios
- 5 asset classes
- 6 securities
- Sample curves and FX rates

### Option B: Manual Setup (5 minutes)
1. Create 2 funds manually
2. Create 5 portfolios
3. Create asset classes
4. Upload `sample-bonds-upload.xlsx`

---

## 10. Final Verification ✓

### Before Demo Starts:

- [ ] Backend running without errors
- [ ] Desktop client launched
- [ ] Can login successfully
- [ ] Dashboard shows live data
- [ ] At least 1 fund exists
- [ ] At least 1 portfolio exists
- [ ] At least 1 security exists
- [ ] Sample Excel file ready to upload
- [ ] Internet connection (for FX rates)

### Have Ready:

- [ ] `DEMO-GUIDE.md` open for reference
- [ ] `sample-bonds-upload.xlsx` ready to drag-and-drop
- [ ] Backup plan: re-seed database if needed

---

## 🚨 Emergency Reset

If something goes wrong during demo:

### Full Reset (30 seconds)
```bash
# Drop and recreate database
dropdb bondvaluator
createdb bondvaluator
psql -d bondvaluator -f database/schema.sql

# Re-seed
cd api-server
node scripts/seed.js

# Restart backend
npm run dev
```

### Quick Restart (10 seconds)
```bash
# Just restart the backend
# Ctrl+C in backend terminal
npm run dev
```

---

## ✅ All Systems Go!

If all checks pass:
- ✅ Database connected
- ✅ Backend API running
- ✅ Desktop client running
- ✅ Sample data loaded
- ✅ Login works
- ✅ All features tested

**You're ready for the demo! Good luck! 🎉**

---

## Support During Demo

### Quick Commands Reference:

```bash
# Backend status
curl http://localhost:3000/api/health

# Check database
psql -d bondvaluator -c "SELECT COUNT(*) FROM securities;"

# View backend logs
# Check terminal where "npm run dev" is running

# Restart backend
# Ctrl+C, then: npm run dev
```

---

**Last Updated:** Just now
**Status:** Ready for demo
