# Quick Start Guide

## Installation Complete! ✓

All required packages have been successfully installed.

## Next Steps

### 1. Get Your FRED API Key

If you don't have a FRED API key yet:
1. Visit: https://fred.stlouisfed.org/docs/api/api_key.html
2. Create a free account (takes 2 minutes)
3. Generate your API key
4. Copy it - you'll need it in the next step

### 2. Run the Application

**Option A: Simple Start (Recommended)**
```bash
python main.py
```

**Option B: Windows Batch File**
```bash
start.bat
```

**Option C: With Command-Line Options**
```bash
# Provide API key directly
python main.py --api-key YOUR_FRED_API_KEY

# Skip initial data load (if you want to start quickly)
python main.py --skip-initial-load

# Custom port
python main.py --port 8080

# Debug mode
python main.py --log-level DEBUG
```

### 3. What Happens Next

The application will:

1. **Prompt for API Key**
   - Enter your FRED API key when prompted
   - It will be validated before proceeding

2. **Initial Data Load (Optional)**
   - First time only: loads all historical data
   - Takes 5-15 minutes depending on connection
   - You can skip this and load later if needed

3. **Start API Server**
   - API will be available at: `http://localhost:8000`
   - Interactive docs at: `http://localhost:8000/docs`

4. **Auto-Refresh Schedule**
   - Daily updates at 6:00 PM (configurable in config.py)
   - Keeps your data current automatically

### 4. Test the API

Once running, try these:

**View Interactive Documentation**
```
Open in browser: http://localhost:8000/docs
```

**Get Latest Treasury Curve**
```bash
curl http://localhost:8000/api/v1/treasury/latest
```

**Check Health**
```bash
curl http://localhost:8000/api/v1/health
```

**Run Example Script**
```bash
python example_usage.py
```

## Troubleshooting

### Port Already in Use
```bash
python main.py --port 8080
```

### Skip Initial Load (Start Quickly)
```bash
python main.py --skip-initial-load
```

### View Logs
Logs are saved to: `D:\FREDAPI\logs\bond_curves.log`

### Re-verify Installation
```bash
python verify_install.py
```

## Configuration

Edit `config.py` to customize:
- API port and host
- Daily refresh time
- Interpolation method
- Data series to track

## What You Can Do

### Get Curves
- Latest Treasury curve
- Historical Treasury curves
- Latest Corporate curves
- Spread curves (Corporate over Treasury)

### Access Raw Data
- Individual series data
- Custom date ranges
- Export to JSON

### Monitor System
- Health checks
- Update logs
- Available date ranges

## Example Workflows

### Workflow 1: Quick Start (Minimal Data)
```bash
# Skip initial load, start immediately
python main.py --skip-initial-load

# API is now running with recent data only
# Visit http://localhost:8000/docs
```

### Workflow 2: Full Historical Load
```bash
# Run with full data load
python main.py

# Choose 'yes' when prompted for initial load
# Wait 5-15 minutes
# Access full historical curves via API
```

### Workflow 3: Development/Testing
```bash
# Debug mode on custom port
python main.py --port 8080 --log-level DEBUG --skip-initial-load
```

## Documentation

- **Full README**: See `README.md` for comprehensive documentation
- **API Docs**: Visit `http://localhost:8000/docs` when running
- **Code Examples**: See `example_usage.py`

## Next Steps

1. Run `python main.py`
2. Enter your FRED API key
3. Choose whether to load historical data
4. Access API at `http://localhost:8000/docs`
5. Start building with yield curves!

---

**Need Help?**
- Check logs in `logs/bond_curves.log`
- Review API docs at `/docs` endpoint
- Verify installation with `python verify_install.py`
