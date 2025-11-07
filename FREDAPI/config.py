"""
Configuration settings for the Bond Curve Builder application.
"""
import os
from pathlib import Path
from typing import Optional

# Base directory
BASE_DIR = Path(__file__).parent

# Database configuration
DATABASE_PATH = BASE_DIR / "database" / "curves.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Logging configuration
LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "bond_curves.log"
LOG_LEVEL = "INFO"

# API Configuration
API_HOST = "0.0.0.0"
API_PORT = 8000
API_TITLE = "Treasury & Corporate Bond Curve API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
A comprehensive API for accessing bootstrapped US Treasury and Corporate Bond yield curves.

Features:
- Historical and current yield curves
- Daily granularity
- Bootstrapped methodology
- Clean JSON output
"""

# FRED API Configuration
FRED_API_KEY: Optional[str] = None  # Will be set at runtime

# US Treasury Series IDs (FRED)
TREASURY_SERIES = {
    "1M": "DGS1MO",   # 1-Month
    "3M": "DGS3MO",   # 3-Month
    "6M": "DGS6MO",   # 6-Month
    "1Y": "DGS1",     # 1-Year
    "2Y": "DGS2",     # 2-Year
    "3Y": "DGS3",     # 3-Year
    "5Y": "DGS5",     # 5-Year
    "7Y": "DGS7",     # 7-Year
    "10Y": "DGS10",   # 10-Year
    "20Y": "DGS20",   # 20-Year
    "30Y": "DGS30",   # 30-Year
}

# Treasury maturity in years (for bootstrapping)
TREASURY_MATURITIES = {
    "1M": 1/12,
    "3M": 3/12,
    "6M": 6/12,
    "1Y": 1,
    "2Y": 2,
    "3Y": 3,
    "5Y": 5,
    "7Y": 7,
    "10Y": 10,
    "20Y": 20,
    "30Y": 30,
}

# Corporate Bond Index Series IDs (FRED)
CORPORATE_SERIES = {
    # Moody's Seasoned AAA Corporate Bond Yield
    "AAA": "DAAA",
    # Moody's Seasoned BAA Corporate Bond Yield
    "BAA": "DBAA",
    # ICE BofA US Corporate Index Effective Yield
    "CORP": "BAMLC0A0CM",
    # ICE BofA US High Yield Index Effective Yield
    "HY": "BAMLH0A0HYM2",
    # ICE BofA 1-3 Year US Corporate Index Effective Yield
    "CORP_1_3Y": "BAMLC1A0C13Y",
    # ICE BofA 3-5 Year US Corporate Index Effective Yield
    "CORP_3_5Y": "BAMLC2A0C35Y",
    # ICE BofA 5-7 Year US Corporate Index Effective Yield
    "CORP_5_7Y": "BAMLC3A0C57Y",
    # ICE BofA 7-10 Year US Corporate Index Effective Yield
    "CORP_7_10Y": "BAMLC4A0C710Y",
    # ICE BofA 10-15 Year US Corporate Index Effective Yield
    "CORP_10_15Y": "BAMLC7A0C1015Y",
    # ICE BofA 15+ Year US Corporate Index Effective Yield
    "CORP_15Y_PLUS": "BAMLC8A0C15PY",
}

# Corporate bond maturity mapping (approximate mid-points)
CORPORATE_MATURITIES = {
    "AAA": 10,  # Generic long-term
    "BAA": 10,  # Generic long-term
    "CORP": 8,  # General corporate index
    "HY": 5,    # High yield typically shorter
    "CORP_1_3Y": 2,
    "CORP_3_5Y": 4,
    "CORP_5_7Y": 6,
    "CORP_7_10Y": 8.5,
    "CORP_10_15Y": 12.5,
    "CORP_15Y_PLUS": 20,
}

# Data refresh schedule
REFRESH_HOUR = 18  # 6 PM daily refresh
REFRESH_MINUTE = 0

# Data processing settings
MAX_MISSING_DATA_DAYS = 5  # Maximum consecutive days of missing data to interpolate
BOOTSTRAPPING_INTERPOLATION_METHOD = "cubic"  # cubic spline interpolation
MIN_DATA_POINTS = 3  # Minimum data points required for curve construction

# Create necessary directories
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)
