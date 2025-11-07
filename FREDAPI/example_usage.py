"""
Example usage of the Bond Curve API.

This script demonstrates how to interact with the API programmatically.
"""
import requests
from datetime import date, timedelta
import json


BASE_URL = "http://localhost:8000/api/v1"


def check_health():
    """Check if the API is running."""
    print("Checking API health...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    print()


def get_latest_treasury_curve():
    """Get the latest Treasury yield curve."""
    print("Fetching latest Treasury curve...")
    response = requests.get(f"{BASE_URL}/treasury/latest")

    if response.status_code == 200:
        data = response.json()
        print(f"Date: {data['curve_date']}")
        print(f"Maturities: {data['maturities']}")
        print(f"Yields: {data['yields']}")
        print()
    else:
        print(f"Error: {response.status_code}")
        print()


def get_treasury_curve_on_date(curve_date: str):
    """Get Treasury curve for a specific date."""
    print(f"Fetching Treasury curve for {curve_date}...")
    response = requests.get(f"{BASE_URL}/treasury/{curve_date}")

    if response.status_code == 200:
        data = response.json()
        print(f"Found curve with {len(data['maturities'])} points")
        print(f"10Y yield: {data['yields'][data['maturities'].index(10)]:.2f}%")
        print()
    else:
        print(f"Error: {response.status_code} - {response.json()['detail']}")
        print()


def get_latest_corporate_curve():
    """Get the latest Corporate bond curve."""
    print("Fetching latest Corporate curve...")
    response = requests.get(f"{BASE_URL}/corporate/latest")

    if response.status_code == 200:
        data = response.json()
        print(f"Date: {data['curve_date']}")
        print(f"Ratings: {data.get('ratings', 'N/A')}")
        print(f"Yields: {data['yields']}")
        print()
    else:
        print(f"Error: {response.status_code}")
        print()


def get_spread_curve(rating: str):
    """Get spread curve for a specific rating."""
    print(f"Fetching {rating} spread curve...")
    response = requests.get(f"{BASE_URL}/corporate/spread/{rating}/latest")

    if response.status_code == 200:
        data = response.json()
        print(f"Date: {data['curve_date']}")
        print(f"Rating: {data['rating']}")
        print(f"Spreads (bps): {data['spreads']}")
        print(f"Corporate Yields: {data['yields']}")
        print()
    else:
        print(f"Error: {response.status_code}")
        print()


def get_treasury_range(days_back: int = 30):
    """Get Treasury curves for a date range."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days_back)

    print(f"Fetching Treasury curves from {start_date} to {end_date}...")
    response = requests.get(
        f"{BASE_URL}/treasury/range/{start_date}/{end_date}"
    )

    if response.status_code == 200:
        data = response.json()
        print(f"Retrieved {len(data)} curves")
        if data:
            print(f"First date: {data[0]['curve_date']}")
            print(f"Last date: {data[-1]['curve_date']}")
        print()
    else:
        print(f"Error: {response.status_code}")
        print()


def get_raw_data(series: str = "10Y", data_type: str = "treasury"):
    """Get raw data for a specific series."""
    print(f"Fetching raw {data_type} data for {series}...")
    response = requests.get(
        f"{BASE_URL}/raw/{data_type}/{series}",
        params={"limit": 10}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"Retrieved {len(data)} observations")
        if data:
            latest = data[0]
            print(f"Latest: {latest['date']} = {latest['value']}%")
        print()
    else:
        print(f"Error: {response.status_code}")
        print()


def get_available_dates():
    """Get information about available curve dates."""
    print("Fetching available dates...")
    response = requests.get(f"{BASE_URL}/dates/available")

    if response.status_code == 200:
        data = response.json()
        for item in data:
            print(f"{item['curve_type'].upper()}:")
            print(f"  Start: {item['start_date']}")
            print(f"  End: {item['end_date']}")
            print(f"  Total curves: {item['total_dates']}")
        print()
    else:
        print(f"Error: {response.status_code}")
        print()


def main():
    """Run example API calls."""
    print("=" * 60)
    print("Bond Curve API - Example Usage")
    print("=" * 60)
    print()

    try:
        # Check if API is running
        check_health()

        # Get available dates
        get_available_dates()

        # Get latest Treasury curve
        get_latest_treasury_curve()

        # Get Treasury curve for a specific date
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        get_treasury_curve_on_date(yesterday)

        # Get latest Corporate curve
        get_latest_corporate_curve()

        # Get spread curves
        get_spread_curve("AAA")
        get_spread_curve("BAA")

        # Get Treasury curves for last 30 days
        get_treasury_range(30)

        # Get raw data
        get_raw_data("10Y", "treasury")
        get_raw_data("AAA", "corporate")

        print("=" * 60)
        print("Examples complete!")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print("\nERROR: Cannot connect to API")
        print("Make sure the server is running: python main.py")
    except Exception as e:
        print(f"\nERROR: {str(e)}")


if __name__ == "__main__":
    main()
