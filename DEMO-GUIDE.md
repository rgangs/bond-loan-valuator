# Bond & Loan Valuator - Demo Guide

## 🚀 Quick Start (15 Minutes)

### Prerequisites
- PostgreSQL installed and running
- Node.js 18+ installed

---

## Step 1: Setup Database (2 minutes)

```bash
# Create database
createdb bondvaluator

# Run schema
psql -d bondvaluator -f database/schema.sql

# Seed sample data (includes default user)
cd api-server
node scripts/seed.js
```

**Default Login:**
- Email: `admin@bondvaluator.com`
- Password: `Admin123!`

---

## Step 2: Start Backend API (1 minute)

```bash
# From api-server directory
cd api-server
npm install
npm run dev
```

Server starts at: `http://localhost:3000`

---

## Step 3: Start Desktop Client (1 minute)

```bash
# From desktop-client directory
cd desktop-client
npm install
npm run dev
```

App will launch automatically in Electron.

---

## Step 4: Login & Navigate (1 minute)

1. **Login** with the default credentials above
2. You'll see the **Operational Overview** dashboard
3. Notice the summary cards showing:
   - Funds count
   - Portfolios count
   - Securities count

---

## Step 5: Setup Hierarchy (3 minutes)

### A. Create Funds

1. Click **"Funds"** in the sidebar
2. Click **"+ New Fund"**
3. Create **Fund 1:**
   - Fund Name: `Global Fixed Income Fund`
   - Fund Code: `GFIF`
   - Currency: `USD`
   - Type: `Fixed Income`
4. Create **Fund 2:**
   - Fund Name: `Emerging Markets Bond Fund`
   - Fund Code: `EMBF`
   - Currency: `USD`
   - Type: `Fixed Income`

### B. Create Portfolios

1. Click **"Portfolios"** in the sidebar
2. Click **"+ New Portfolio"**
3. Create 5 portfolios (distribute across the two funds):

**Portfolio 1:**
- Portfolio Name: `US Corporate Bonds`
- Fund: Select `Global Fixed Income Fund`

**Portfolio 2:**
- Portfolio Name: `US Government Securities`
- Fund: Select `Global Fixed Income Fund`

**Portfolio 3:**
- Portfolio Name: `Floating Rate Notes`
- Fund: Select `Global Fixed Income Fund`

**Portfolio 4:**
- Portfolio Name: `Energy Sector Bonds`
- Fund: Select `Emerging Markets Bond Fund`

**Portfolio 5:**
- Portfolio Name: `High Yield Portfolio`
- Fund: Select `Emerging Markets Bond Fund`

### C. Create Asset Classes

For each portfolio created above, create an asset class:

1. Click **"Asset Classes"** in the sidebar
2. Filter by each portfolio
3. Click **"+ New Asset Class"**
4. Create asset classes like:
   - `Investment Grade Corporate`
   - `Government Bonds`
   - `Floating Rate Notes`
   - `Energy Bonds`
   - `High Yield`

---

## Step 6: Upload Securities (2 minutes)

1. Click **"Upload"** in the sidebar
2. Drag and drop or select the file: **`sample-bonds-upload.xlsx`**
3. The file contains 5 bonds:
   - Apple Inc. 3.25% 2029 (Fixed Rate)
   - US Treasury Zero Coupon 2030
   - Morgan Stanley Float 2027 (Floating Rate)
   - Shell International 4.125% 2028
   - Ford Motor Credit 5.875% 2026 (High Yield)

4. **Select an Asset Class ID** from the dropdown
5. Click **"Validate"** to check the data
6. Click **"Import"** to upload

**Repeat** the upload for different asset classes to distribute the bonds across your portfolios.

---

## Step 7: Run a Valuation (3 minutes)

### A. Navigate to Valuation Page

1. Click **"Valuation"** in the sidebar
2. You'll see the valuation setup screen

### B. Configure Valuation Run

**Run Type:** Choose one of:
- **Security** - Value a single security
- **Portfolio** - Value all securities in a portfolio
- **Fund** - Value all securities across all portfolios in a fund

**Target:** Select the fund, portfolio, or security to value

**Valuation Date:** Enter today's date (YYYY-MM-DD format)

**Options:**
- **Base Curve:** Select `SOFR` (or another curve if available)
- **Curve Date:** Enter a recent date
- **Reporting Currency:** `USD`
- **Parallel Processing:** Toggle ON
- **Concurrency:** `4` (adjust based on your CPU)

### C. Execute the Run

1. Click **"Run Valuation"**
2. You'll see a progress indicator
3. Once complete, you'll be redirected to the **Results** page

---

## Step 8: View Results (2 minutes)

### Results Dashboard

The results page shows:
- **Summary Cards:**
  - Total Fair Value
  - Total Book Value
  - Unrealized Gain/Loss
  - Number of securities valued

- **Results Table:**
  - Each security with its:
    - Security Name
    - Book Value
    - Fair Value
    - Gain/Loss (color-coded: green = gain, red = loss)
    - IFRS Classification
    - Last updated timestamp

- **Charts & Visualizations:**
  - Fair value distribution
  - Gain/Loss breakdown

### Export Results

1. Click **"Export to Excel"** to download a detailed report
2. The Excel file includes:
   - Summary sheet
   - Calculation steps
   - Audit trail
   - Cash flow projections

---

## Step 9: View Audit Trail

1. Click **"Audit"** in the sidebar
2. View all valuation runs and changes:
   - Who made the change
   - When it was made
   - What was changed
3. Filter by date range or action type
4. Export audit logs to Excel

---

## 💡 Additional Features to Demo

### Securities Management
- Navigate to **"Securities"** to see all imported bonds
- Use filters to find specific types, currencies, or ratings
- Click on a security to view details
- Edit or delete securities as needed

### Positions Management
- Navigate to **"Positions"**
- View all holdings across asset classes
- Update quantities or book values
- Mark positions as sold, defaulted, or transferred

### Discount Curves
- Navigate to **"Curves"** to view available yield curves
- Add manual curves
- View curve history

### FX Rates
- Navigate to **"FX"** to view exchange rates
- Add manual rate overrides for specific dates
- Used for multi-currency valuations

---

## 🔧 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -l | grep bondvaluator
```

### Backend Not Starting
```bash
# Check .env file exists
cd api-server
cp .env.example .env
# Edit .env with your database credentials
```

### Desktop Client Not Launching
```bash
# Clear cache and rebuild
cd desktop-client
rm -rf node_modules
npm install
npm run dev
```

---

## 📊 Key Metrics for Demo

After completing all steps, you should have:
- ✅ 2 Funds created
- ✅ 5 Portfolios created
- ✅ 5 Asset Classes created
- ✅ 5 Securities imported
- ✅ At least 1 successful valuation run
- ✅ Audit trail showing all activities

---

## 🎯 Demo Script (5-Minute Version)

1. **Login & Dashboard** (30 sec)
   - Show real-time metrics

2. **Navigate Hierarchy** (1 min)
   - Quick tour of Funds → Portfolios → Asset Classes

3. **View Securities** (1 min)
   - Show imported bonds with details
   - Highlight different instrument types

4. **Run Valuation** (2 min)
   - Select a portfolio
   - Configure and execute
   - Show progress

5. **Review Results** (1.5 min)
   - Explain fair value vs book value
   - Show gain/loss
   - Export to Excel

---

## 📞 Support

For issues during the demo:
- Check backend logs: `api-server/` console output
- Check database: `psql -d bondvaluator`
- Restart services if needed

**Sample Data Location:**
- Excel Upload: `sample-bonds-upload.xlsx`
- Seed Script: `api-server/scripts/seed.js`

---

**Good luck with your demo! 🎉**
