# Yield Curve Dashboard

## Access Your Dashboard

Once the server is running, open your browser and go to:

**http://localhost:8000**

## Features

### Interactive Charts
- **Treasury Yield Curve** - See all US Treasury yields from 1M to 30Y
- **Corporate Bond Yield Curve** - View corporate bond yields across maturities
- **Forward Rates** - Instantaneous forward rates derived from the yield curve
- **Credit Spreads** - Corporate spreads over treasuries in basis points

### Controls
- **Select Date**: Pick any historical date to view curves
- **Load Latest**: View the most recent curves available
- **Load Curves**: Refresh with selected date

### Statistics Dashboard
At the top of the page you'll see:
- Total number of Treasury curves available
- Total number of Corporate curves available
- Latest data date
- Total data points in database

## How It Works

1. The dashboard connects to your local API at `/api/v1`
2. Fetches curve data in real-time
3. Renders beautiful interactive charts using Plotly.js
4. Allows you to zoom, pan, and hover for details
5. Automatically adjusts to your screen size

## Tips

- **Hover** over any point on the chart to see exact values
- **Zoom** by clicking and dragging on any chart
- **Double-click** to reset zoom
- **Use the date picker** to explore historical curves
- Charts update automatically when you select a new date

## Troubleshooting

**Dashboard not loading?**
- Make sure the server is running (`python main.py`)
- Check you're using `http://localhost:8000` (not 0.0.0.0)
- Try refreshing the page

**No data showing?**
- Ensure you've completed the initial data load
- Check that curves were built successfully in the logs
- Try clicking "Load Latest" button

**Charts not displaying?**
- Check your browser console for errors (F12)
- Ensure you have internet connection (for Plotly.js CDN)
- Try a different browser (Chrome recommended)

## URLs

- **Dashboard**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health
- **Latest Treasury**: http://localhost:8000/api/v1/treasury/latest
- **Latest Corporate**: http://localhost:8000/api/v1/corporate/latest

Enjoy visualizing your yield curves!
