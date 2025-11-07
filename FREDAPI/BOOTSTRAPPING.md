# Bootstrapping & Interpolation Guide

## What is Bootstrapping?

Bootstrapping creates a **smooth, continuous yield curve** from sparse market data points. Instead of only having rates for standard tenors (3M, 6M, 1Y, 2Y, etc.), you get rates for **ANY maturity**.

### Example:
- **Market Data**: 10Y = 4.50%, 20Y = 4.75%
- **Bootstrapped**: You can now query 10Y + 2 days (10.0055 years) and get an exact interpolated rate!

## How It Works

1. **Fetch Market Data**: Get yields for standard tenors from FRED
2. **Cubic Spline Interpolation**: Create smooth curve between points
3. **Daily Granularity**: Generate yields for every day of the curve
4. **Store & Serve**: Save interpolated curves for fast API access

## API Features

### 1. Get Full Bootstrapped Curve

**Treasury:**
```bash
curl http://localhost:8000/api/v1/treasury/latest
```

**Response includes:**
```json
{
  "curve_date": "2025-10-23",
  "maturities": [0.083, 0.086, 0.089, ..., 29.997, 30.0],  // Daily points!
  "yields": [5.42, 5.41, 5.40, ..., 4.68, 4.68],
  "original_maturities": [0.083, 0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30],
  "original_yields": [5.42, 5.38, 5.25, 5.12, 4.85, 4.68, 4.52, 4.48, 4.45, 4.62, 4.68]
}
```

### 2. Get Yield for ANY Specific Maturity

**Treasury Rate for 10 Years and 2 Days:**
```bash
curl http://localhost:8000/api/v1/treasury/2025-10-23/yield/10.0055
```

**Response:**
```json
{
  "curve_date": "2025-10-23",
  "maturity": 10.0055,
  "yield": 4.450123,
  "curve_type": "treasury",
  "interpolation_method": "cubic"
}
```

**Corporate Rate for 5 Years and 100 Days:**
```bash
curl http://localhost:8000/api/v1/corporate/2025-10-23/yield/5.274
```

## Dashboard Visualization

The dashboard now shows:

1. **Smooth Interpolated Curve** (blue line) - Daily granularity with thousands of points
2. **Original Market Data** (red diamonds) - The actual FRED data points

### Features:
- Hover over ANY point on the curve to see exact maturity and yield
- Title shows total interpolated points (e.g., "11,000 interpolated points")
- Legend distinguishes between bootstrapped curve and market data

## Python Examples

### Get Rate for Specific Maturity
```python
import requests

# 10 years and 2 days
maturity = 10 + (2/365)  # 10.0055 years
response = requests.get(f'http://localhost:8000/api/v1/treasury/2025-10-23/yield/{maturity}')
data = response.json()
print(f"Rate for {maturity:.4f}Y: {data['yield']:.6f}%")
```

### Calculate Present Value
```python
# Use interpolated curve for precise PV calculation
def get_treasury_rate(maturity_years):
    url = f'http://localhost:8000/api/v1/treasury/latest/yield/{maturity_years}'
    response = requests.get(url)
    return response.json()['yield']

# Price a bond maturing in 7 years and 156 days
maturity = 7 + (156/365)
rate = get_treasury_rate(maturity)
print(f"Discount rate for {maturity:.4f}Y: {rate:.6f}%")
```

### Get Full Interpolated Curve
```python
response = requests.get('http://localhost:8000/api/v1/treasury/latest')
curve = response.json()

# Original sparse market data
print(f"Market data points: {len(curve['original_maturities'])}")
print(f"Original maturities: {curve['original_maturities']}")

# Bootstrapped daily granularity
print(f"Interpolated points: {len(curve['maturities'])}")
print(f"Maturity range: {curve['maturities'][0]:.4f}Y to {curve['maturities'][-1]:.4f}Y")

# Use for valuation
for maturity, yield_val in zip(curve['maturities'], curve['yields']):
    discount_factor = (1 + yield_val/100) ** (-maturity)
    print(f"{maturity:.4f}Y: {yield_val:.6f}% (DF: {discount_factor:.8f})")
```

## Technical Details

### Interpolation Method
- **Cubic Spline**: Ensures C² continuity (smooth first and second derivatives)
- **Daily Granularity**: ~365 points per year
- **Total Points**: ~11,000 points for 30-year curve

### Data Fields

**Standard Curve Response:**
- `maturities`: Interpolated daily maturities (default, use this!)
- `yields`: Interpolated daily yields (default, use this!)
- `original_maturities`: Market data maturities (11 points)
- `original_yields`: Market data yields (11 points)
- `discount_factors`: Discount factors for each original maturity
- `forward_rates`: Forward rates for each original maturity

### Precision
- Maturity: 4 decimal places (~1 day precision)
- Yield: 6 decimal places (0.0001 bps precision)

## Use Cases

### 1. Bond Pricing
Get exact discount rate for any bond maturity:
```bash
# Bond matures in 8 years, 7 months, 15 days
# = 8 + (7*30.4 + 15)/365 = 8.625 years
curl http://localhost:8000/api/v1/treasury/latest/yield/8.625
```

### 2. Swap Valuation
Price interest rate swaps with exact day count:
```bash
# 5-year swap with 1,826 days to maturity
# = 1826/365 = 5.0027 years
curl http://localhost:8000/api/v1/treasury/latest/yield/5.0027
```

### 3. Risk Analysis
Calculate DV01 with precise curve shifts:
```python
# Parallel shift all curve points by 1bp
curve = requests.get('http://localhost:8000/api/v1/treasury/latest').json()

for maturity in curve['maturities']:
    base_rate = requests.get(f'http://localhost:8000/api/v1/treasury/latest/yield/{maturity}').json()['yield']
    # Apply +1bp shift for DV01 calculation
    shifted_rate = base_rate + 0.01
```

## Limitations

- **Extrapolation**: Rates outside min/max maturity range return error
- **Historical Data**: Only dates with sufficient market data (3+ points) have curves
- **Frequency**: Daily curves (not intraday)

## Performance

- **API Response**: < 50ms for single maturity query
- **Full Curve**: < 100ms with ~11,000 interpolated points
- **Storage**: Interpolated curves pre-computed and cached in database

## Best Practices

1. **Use interpolated curves** (default) for all calculations
2. **Reference original data** to see actual market quotes
3. **Check date availability** before querying historical dates
4. **Stay within bounds** - don't extrapolate beyond min/max maturity

---

Now you have **true bootstrapped curves** with rates for every single day! 📈
