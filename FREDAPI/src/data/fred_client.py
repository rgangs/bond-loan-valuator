"""
FRED API client for fetching Treasury and Corporate bond data.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
from fredapi import Fred
import logging
import config

logger = logging.getLogger(__name__)


class FREDClient:
    """Client for interacting with FRED API."""

    def __init__(self, api_key: str):
        """
        Initialize FRED client.

        Args:
            api_key: FRED API key
        """
        self.fred = Fred(api_key=api_key)
        self.api_key = api_key
        logger.info("FRED client initialized successfully")

    def fetch_treasury_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetch all US Treasury yield data.

        Args:
            start_date: Start date (YYYY-MM-DD format). If None, fetches all available data.
            end_date: End date (YYYY-MM-DD format). If None, uses today.

        Returns:
            DataFrame with dates as index and treasury series as columns
        """
        logger.info(f"Fetching Treasury data from {start_date or 'beginning'} to {end_date or 'today'}")

        all_data = {}
        successful_series = []
        failed_series = []

        for tenor, series_id in config.TREASURY_SERIES.items():
            try:
                series = self.fred.get_series(
                    series_id,
                    observation_start=start_date,
                    observation_end=end_date
                )
                all_data[tenor] = series
                successful_series.append(f"{tenor} ({series_id})")
                logger.debug(f"Successfully fetched {tenor}: {len(series)} observations")
            except Exception as e:
                logger.error(f"Failed to fetch {tenor} ({series_id}): {str(e)}")
                failed_series.append(f"{tenor} ({series_id})")

        if not all_data:
            raise ValueError("Failed to fetch any Treasury data from FRED")

        # Combine into single DataFrame
        df = pd.DataFrame(all_data)
        df.index.name = 'date'

        logger.info(
            f"Treasury data fetch complete. "
            f"Successful: {len(successful_series)}, Failed: {len(failed_series)}"
        )

        if failed_series:
            logger.warning(f"Failed series: {', '.join(failed_series)}")

        return df

    def fetch_corporate_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetch all corporate bond index data.

        Args:
            start_date: Start date (YYYY-MM-DD format). If None, fetches all available data.
            end_date: End date (YYYY-MM-DD format). If None, uses today.

        Returns:
            DataFrame with dates as index and corporate series as columns
        """
        logger.info(f"Fetching Corporate data from {start_date or 'beginning'} to {end_date or 'today'}")

        all_data = {}
        successful_series = []
        failed_series = []

        for rating, series_id in config.CORPORATE_SERIES.items():
            try:
                series = self.fred.get_series(
                    series_id,
                    observation_start=start_date,
                    observation_end=end_date
                )
                all_data[rating] = series
                successful_series.append(f"{rating} ({series_id})")
                logger.debug(f"Successfully fetched {rating}: {len(series)} observations")
            except Exception as e:
                logger.error(f"Failed to fetch {rating} ({series_id}): {str(e)}")
                failed_series.append(f"{rating} ({series_id})")

        if not all_data:
            raise ValueError("Failed to fetch any Corporate data from FRED")

        # Combine into single DataFrame
        df = pd.DataFrame(all_data)
        df.index.name = 'date'

        logger.info(
            f"Corporate data fetch complete. "
            f"Successful: {len(successful_series)}, Failed: {len(failed_series)}"
        )

        if failed_series:
            logger.warning(f"Failed series: {', '.join(failed_series)}")

        return df

    def fetch_series_info(self, series_id: str) -> Dict:
        """
        Fetch metadata about a specific series.

        Args:
            series_id: FRED series ID

        Returns:
            Dictionary containing series metadata
        """
        try:
            info = self.fred.get_series_info(series_id)
            return {
                'id': info.get('id'),
                'title': info.get('title'),
                'observation_start': info.get('observation_start'),
                'observation_end': info.get('observation_end'),
                'frequency': info.get('frequency'),
                'units': info.get('units'),
                'seasonal_adjustment': info.get('seasonal_adjustment'),
            }
        except Exception as e:
            logger.error(f"Failed to fetch info for {series_id}: {str(e)}")
            return {}

    def get_latest_observation_date(self, series_id: str) -> Optional[datetime]:
        """
        Get the latest observation date for a series.

        Args:
            series_id: FRED series ID

        Returns:
            Latest observation date or None if not available
        """
        try:
            series = self.fred.get_series(series_id)
            if series is not None and len(series) > 0:
                return series.index[-1].to_pydatetime()
        except Exception as e:
            logger.error(f"Failed to get latest date for {series_id}: {str(e)}")
        return None

    def validate_api_key(self) -> bool:
        """
        Validate that the API key is working.

        Returns:
            True if API key is valid, False otherwise
        """
        try:
            # Try to fetch a small amount of data to test the API key
            test_series = self.fred.get_series('DGS10', observation_start='2020-01-01', observation_end='2020-01-31')
            return test_series is not None and len(test_series) > 0
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False
