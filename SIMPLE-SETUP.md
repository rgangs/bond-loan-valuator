# Bond & Loan Valuator - Simple Setup Guide

**Follow these steps in order. Each step should take 2-5 minutes.**

---

## Step 1: Download Required Software

You need to install 3 programs first. Click each link and download:

### 1. Node.js (Required)
- **Download:** https://nodejs.org/
- Click the big green button that says "Download Node.js (LTS)"
- Install it (keep clicking "Next" with all the default options)
- **Restart your computer after installing**

### 2. PostgreSQL Database (Required)
- **Download:** https://www.postgresql.org/download/windows/
- Download version 14 or newer
- During installation, it will ask for a password - **WRITE THIS PASSWORD DOWN!**
- Keep all other settings as default
- When it asks about "port", leave it as **5432**

### 3. Git (Required to download the app)
- **Download:** https://git-scm.com/downloads
- Install it (keep all default options)

### 4. Python (Optional - only needed for live market data)
- **Download:** https://www.python.org/downloads/
- During install, **CHECK THE BOX** that says "Add Python to PATH"
- If you skip this, the app will still work but won't have live market data

---

## Step 2: Download the Application

### Option A: Using Git (Recommended)

1. **Open Command Prompt:**
   - Press `Windows Key + R`
   - Type `cmd` and press Enter

2. **Navigate to where you want the app:**
   ```
   cd C:\
   ```

3. **Download the app:**
   ```
   git clone https://github.com/rgangs/bond-loan-valuator.git
   ```

4. **Go into the folder:**
   ```
   cd bond-loan-valuator
   ```

### Option B: Download ZIP (Alternative)

1. Go to: https://github.com/rgangs/bond-loan-valuator
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file to `C:\bond-loan-valuator`
5. Open Command Prompt (`Windows Key + R`, type `cmd`, press Enter)
6. Type: `cd C:\bond-loan-valuator`

---

## Step 3: Set Up the Database

1. **Open Command Prompt** (if you closed it)
   - Press `Windows Key + R`
   - Type `cmd` and press Enter

2. **Create the database:**
   ```
   psql -U postgres -c "CREATE DATABASE bondvaluator"
   ```
   - It will ask for password - use the PostgreSQL password you wrote down in Step 1

3. **Load the database structure:**
   ```
   cd C:\bond-loan-valuator
   psql -U postgres -d bondvaluator -f database\schema.sql
   ```
   - Enter your PostgreSQL password again

---

## Step 4: Configure the App

1. **Open the folder:**
   - Go to `C:\bond-loan-valuator\api-server`

2. **Find the file `.env.example`**
   - Right-click it → "Open with" → Notepad

3. **Change these lines:**
   ```
   DB_PASSWORD=your_password_here
   ```
   Replace `your_password_here` with the PostgreSQL password you wrote down

4. **Change the secret key:**
   ```
   JWT_SECRET=your-super-secret-key-change-this
   ```
   Replace it with anything you want (like: `my-secret-password-12345`)

5. **Save the file as `.env`** (NOT `.env.example`)
   - In Notepad: File → Save As
   - File name: `.env` (exactly like this)
   - Save as type: "All Files"
   - Click Save

---

## Step 5: Run the Application

1. **Open Command Prompt:**
   - Press `Windows Key + R`
   - Type `cmd` and press Enter

2. **Go to the app folder:**
   ```
   cd C:\bond-loan-valuator
   ```

3. **Start everything:**
   ```
   node scripts/dev.js
   ```

4. **Wait 1-2 minutes** while it installs and starts everything

5. **The desktop app will open automatically!**

---

## Step 6: Create Your First User

1. **Run this command** (in Command Prompt):
   ```
   cd C:\bond-loan-valuator\api-server
   node scripts/seed.js
   ```

2. **Login to the app:**
   - Email: `admin@example.com`
   - Password: `admin123`

3. **Change the password after first login!**

---

## 🎉 You're Done!

The app should now be running. You'll see a desktop window with the Bond & Loan Valuator.

---

## How to Start the App in the Future

After the first setup, starting the app is easy:

1. Open Command Prompt (`Windows Key + R`, type `cmd`)
2. Type:
   ```
   cd C:\bond-loan-valuator
   node scripts/dev.js
   ```
3. Wait for the desktop app to open

---

## Common Problems & Solutions

### Problem: "command not found" or "is not recognized"

**Solution:** Restart your computer. Windows needs to restart to recognize the new programs.

---

### Problem: "password authentication failed"

**Solution:** You entered the wrong PostgreSQL password. Edit the `.env` file again:
1. Go to `C:\bond-loan-valuator\api-server`
2. Open `.env` with Notepad
3. Fix the `DB_PASSWORD=` line
4. Save and try again

---

### Problem: "port 3000 already in use"

**Solution:** Something else is using that port. Either:
1. Restart your computer, OR
2. Edit `.env` file and change `PORT=3000` to `PORT=3001`

---

### Problem: Desktop app doesn't open

**Solution:**
1. Open your web browser
2. Go to: http://localhost:3000
3. You can use it in the browser instead

---

## What Each Part Does

- **PostgreSQL** = The database that stores all your bonds, portfolios, and valuations
- **Node.js** = Runs the backend server and desktop app
- **Python** (optional) = Gets live market data from Federal Reserve
- **The App Folder** = Contains all the code and files

---

## Getting Help

If something doesn't work:

1. Take a screenshot of any error messages
2. Note which step you're on
3. Contact your implementation team with the screenshot

---

## Video Tutorial (Alternative)

**Prefer video instructions?** Contact your team to request a screen recording walkthrough.

---

**Remember:** After the initial setup, you only need to run one command to start the app:
```
cd C:\bond-loan-valuator
node scripts/dev.js
```

Everything else is automatic!
