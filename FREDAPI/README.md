# Treasury & Corporate Bond Curve Builder with API

A comprehensive system for building, storing, and serving US Treasury and Corporate Bond yield curves via REST API. Think of it as your personal yield curve vending machine - feed it your FRED API key, and it serves up beautiful, smooth interest rate curves whenever you need them.

## Features

### US Treasury Curves
- Fetches all US Treasury securities (bills, notes, bonds - 1M to 30Y)
- Historical data from the beginning of available FRED data through today
- Bootstrapped yield curves with daily granularity
- Automatic daily updates
- Discount factors and forward rates

### Corporate Bond Curves
- Multiple corporate bond indices from FRED
- Investment grade (AAA, BAA) and High Yield indices
- Multiple maturity buckets (1-3Y, 3-5Y, 5-7Y, 7-10Y, 10-15Y, 15Y+)
- Spread curves over treasuries
- Bootstrapped curves with daily granularity

### REST API
- Historical curves (any date)
- Latest curves (current data)
- Raw data access
- Clean JSON output
- Interactive API documentation (Swagger UI)
- Health check endpoint

### Technical Features
- Proper bootstrapping methodology with cubic spline interpolation
- Graceful handling of missing data
- SQLite database for fast retrieval
- Automatic daily refresh at configurable time
- Comprehensive logging
- Error handling and data validation

## Requirements

- Python 3.8 or higher
- FRED API key (free from https://fred.stlouisfed.org/docs/api/api_key.html)

## Installation

### 1. Install Python Dependencies

```bash
cd D:\FREDAPI
pip install -r requirements.txt
```

### 2. Get Your FRED API Key

1. Go to https://fred.stlouisfed.org/docs/api/api_key.html
2. Sign up for a free account
3. Generate your API key
4. Keep it handy - you'll need it when running the app

## Usage

### Quick Start

```bash
python main.py
```

The application will:
1. Prompt you for your FRED API key
2. Validate the key
3. Ask if you want to perform initial data load
4. Start the API server
5. Begin daily auto-refresh schedule

### Command-Line Options

```bash
# Provide API key via command line
python main.py --api-key YOUR_FRED_API_KEY

# Skip initial data load (if you already have data)
python main.py --skip-initial-load

# Set custom port
python main.py --port 8080

# Set logging level
python main.py --log-level DEBUG

# Combine options
python main.py --api-key YOUR_KEY --port 8080 --log-level INFO
```

### Initial Data Load

On first run, the system will offer to fetch all historical data:
- This is a one-time operation
- Takes 5-15 minutes depending on your connection
- Downloads data from early 1960s to present
- Builds curves for all available dates

You can skip this and just fetch recent data if you prefer.

## API Endpoints

Once running, access the API at `http://localhost:8000`

### Interactive Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

#### Treasury Curves

**Get Latest Treasury Curve**
```
GET /api/v1/treasury/latest
```

**Get Treasury Curve for Specific Date**
```
GET /api/v1/treasury/2024-01-15
```

**Get Treasury Curves for Date Range**
```
GET /api/v1/treasury/range/2024-01-01/2024-12-31
```

#### Corporate Curves

**Get Latest Corporate Curve**
```
GET /api/v1/corporate/latest
```

**Get Corporate Curve for Specific Date**
```
GET /api/v1/corporate/2024-01-15
```

**Get Spread Curve (Corporate over Treasury)**
```
GET /api/v1/corporate/spread/AAA/latest
GET /api/v1/corporate/spread/BAA/2024-01-15
```

#### Raw Data

**Get Raw Treasury Data**
```
GET /api/v1/raw/treasury/10Y?start_date=2024-01-01&end_date=2024-12-31
```

**Get Raw Corporate Data**
```
GET /api/v1/raw/corporate/AAA?start_date=2024-01-01
```

#### Metadata

**Check Available Dates**
```
GET /api/v1/dates/available
```

**Health Check**
```
GET /api/v1/health
```

## Example API Responses

### Treasury Curve Response
```json
{
  "curve_type": "treasury",
  "curve_date": "2024-01-15",
  "maturities": [0.083, 0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30],
  "yields": [5.42, 5.38, 5.25, 5.12, 4.85, 4.68, 4.52, 4.48, 4.45, 4.62, 4.68],
  "discount_factors": [0.9956, 0.9867, 0.9745, ...],
  "forward_rates": [5.42, 5.35, 5.10, ...],
  "interpolated_maturities": [0.083, 0.086, 0.089, ...],
  "interpolated_yields": [5.42, 5.41, 5.40, ...]
}
```

### Spread Curve Response
```json
{
  "rating": "AAA",
  "curve_date": "2024-01-15",
  "maturities": [10],
  "spreads": [0.85],
  "yields": [5.30],
  "treasury_yields": [4.45]
}
```

## Configuration

Edit `config.py` to customize:

### API Settings
```python
API_HOST = "0.0.0.0"
API_PORT = 8000
```

### Refresh Schedule
```python
REFRESH_HOUR = 18  # 6 PM daily refresh
REFRESH_MINUTE = 0
```

### Data Processing
```python
BOOTSTRAPPING_INTERPOLATION_METHOD = "cubic"  # cubic, linear, or quadratic
MIN_DATA_POINTS = 3  # Minimum points required for curve
MAX_MISSING_DATA_DAYS = 5  # Max consecutive days to interpolate
```

## Project Structure

```
D:\FREDAPI\
├── main.py                 # Application entry point
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── README.md              # This file
│
├── src/
│   ├── api/
│   │   ├── app.py         # FastAPI application
│   │   └── routes.py      # API endpoints
│   │
│   ├── data/
│   │   ├── fred_client.py      # FRED API client
│   │   ├── treasury_builder.py # Treasury curve builder
│   │   └── corporate_builder.py # Corporate curve builder
│   │
│   ├── models/
│   │   └── database.py    # Database models
│   │
│   └── utils/
│       ├── bootstrapping.py # Yield curve bootstrapping
│       ├── scheduler.py     # Auto-refresh scheduler
│       └── logger.py        # Logging configuration
│
├── database/
│   └── curves.db          # SQLite database (created at runtime)
│
└── logs/
    └── bond_curves.log    # Application logs
```

## Data Sources

All data is sourced from the Federal Reserve Economic Data (FRED) API:

### Treasury Series
- 1M, 3M, 6M: Treasury Bills
- 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 20Y, 30Y: Treasury Notes/Bonds

### Corporate Series
- AAA: Moody's Seasoned AAA Corporate Bond Yield
- BAA: Moody's Seasoned BAA Corporate Bond Yield
- CORP: ICE BofA US Corporate Index
- HY: ICE BofA US High Yield Index
- Multiple maturity buckets from ICE BofA indices

## Bootstrapping Methodology

The system uses a sophisticated bootstrapping approach:

1. **Zero Curve Construction**: Converts par yields to zero-coupon rates
2. **Discount Factors**: Calculates discount factors for each maturity
3. **Forward Rates**: Derives instantaneous forward rates
4. **Interpolation**: Uses cubic spline interpolation for daily granularity
5. **Smoothing**: Applies smoothing to reduce noise while preserving shape

## Automated Refresh

The system automatically refreshes data daily:
- Default time: 6:00 PM (configurable in `config.py`)
- Fetches last 30 days (to capture revisions)
- Updates database with new data
- Rebuilds affected curves
- Logs all operations

## Logging

Logs are stored in `logs/bond_curves.log` and include:
- Data fetch operations
- Curve building status
- API requests
- Errors and warnings
- Scheduled refresh results

Console output uses color-coded log levels for easy monitoring.

## Error Handling

The system gracefully handles:
- Missing data points (interpolation)
- API failures (retry logic)
- Invalid dates (proper error messages)
- Database issues (transaction rollback)
- Insufficient data (skips curve building)

## Performance

- **Initial Load**: 5-15 minutes for full history
- **Daily Refresh**: 30-60 seconds
- **API Response**: < 100ms for most queries
- **Database Size**: ~50-100 MB for full history

## Troubleshooting

### API Key Issues
```
Error: API key validation failed
```
- Verify your FRED API key is correct
- Check your internet connection
- Ensure FRED API is accessible

### Database Issues
```
Error: Database locked
```
- Close any other applications accessing the database
- Restart the application

### Missing Data
```
Warning: Invalid curve data for [date]
```
- Some dates may have insufficient data points
- System will skip these dates automatically
- Not an error - just a data availability issue

## Development

### Running Tests
```bash
pytest
```

### Database Schema Updates
The database is automatically created and updated on startup.

### Adding New Series
1. Add series ID to `config.py`
2. Add maturity mapping
3. Restart application

## License

This project is for educational and research purposes.

## Credits

- Data: Federal Reserve Economic Data (FRED)
- API: Federal Reserve Bank of St. Louis

## Support

For issues or questions:
1. Check the logs in `logs/bond_curves.log`
2. Review API documentation at `http://localhost:8000/docs`
3. Verify FRED API key and connectivity

## Version

**Version 1.0.0** - Initial Release

---

Built with ❤️ for quantitative finance
