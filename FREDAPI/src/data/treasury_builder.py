"""
US Treasury Curve Builder.
"""
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
import logging

import config
from src.models.database import RawYieldData, BootstrappedCurve
from src.utils.bootstrapping import YieldCurveBootstrapper, validate_curve_data

logger = logging.getLogger(__name__)


class TreasuryCurveBuilder:
    """Build and manage US Treasury yield curves."""

    def __init__(self, db_session: Session):
        """
        Initialize Treasury curve builder.

        Args:
            db_session: Database session
        """
        self.db = db_session
        self.bootstrapper = YieldCurveBootstrapper(
            interpolation_method=config.BOOTSTRAPPING_INTERPOLATION_METHOD
        )

    def store_raw_data(self, df: pd.DataFrame) -> int:
        """
        Store raw Treasury data in database.

        Args:
            df: DataFrame with dates as index and tenors as columns

        Returns:
            Number of records stored
        """
        logger.info(f"Storing raw Treasury data: {len(df)} dates, {len(df.columns)} series")

        records_stored = 0

        for date_idx in df.index:
            curve_date = date_idx.date() if isinstance(date_idx, pd.Timestamp) else date_idx

            for tenor in df.columns:
                value = df.loc[date_idx, tenor]
                series_id = config.TREASURY_SERIES.get(tenor)

                if series_id is None:
                    continue

                # Check if record exists
                existing = self.db.query(RawYieldData).filter_by(
                    series_id=series_id,
                    date=curve_date
                ).first()

                if existing:
                    # Update existing record
                    if pd.notna(value):
                        existing.value = float(value)
                        existing.updated_at = datetime.utcnow()
                else:
                    # Create new record
                    record = RawYieldData(
                        series_id=series_id,
                        series_name=tenor,
                        data_type='treasury',
                        date=curve_date,
                        value=float(value) if pd.notna(value) else None
                    )
                    self.db.add(record)

                records_stored += 1

        self.db.commit()
        logger.info(f"Stored {records_stored} Treasury data records")

        return records_stored

    def build_curve(self, curve_date: date) -> Optional[Dict]:
        """
        Build bootstrapped yield curve for a specific date.

        Args:
            curve_date: Date for which to build the curve

        Returns:
            Dictionary containing curve data or None if insufficient data
        """
        # Fetch raw data for this date
        raw_data = self.db.query(RawYieldData).filter_by(
            data_type='treasury',
            date=curve_date
        ).all()

        if not raw_data:
            logger.debug(f"No Treasury data found for {curve_date}")
            return None

        # Extract maturities and yields
        maturities = []
        yields = []

        for record in raw_data:
            tenor = record.series_name
            if tenor in config.TREASURY_MATURITIES and record.value is not None:
                maturities.append(config.TREASURY_MATURITIES[tenor])
                yields.append(record.value)

        # Validate data
        is_valid, error_msg = validate_curve_data(
            maturities,
            yields,
            min_points=config.MIN_DATA_POINTS
        )

        if not is_valid:
            logger.debug(f"Skipping {curve_date}: {error_msg}")
            return None

        try:
            # Bootstrap the curve
            zero_rates, discount_factors, forward_rates = self.bootstrapper.bootstrap_zero_curve(
                maturities,
                yields
            )

            # Interpolate to daily granularity
            interpolated_maturities, interpolated_yields = self.bootstrapper.interpolate_curve(
                maturities,
                zero_rates
            )

            # Prepare curve data
            curve_data = {
                'curve_type': 'treasury',
                'curve_date': curve_date,
                'maturities': maturities,
                'yields': yields,
                'interpolated_maturities': interpolated_maturities.tolist(),
                'interpolated_yields': interpolated_yields.tolist(),
                'discount_factors': discount_factors.tolist(),
                'forward_rates': forward_rates.tolist(),
            }

            logger.debug(f"Built Treasury curve for {curve_date} with {len(maturities)} points")

            return curve_data

        except Exception as e:
            logger.error(f"Failed to build curve for {curve_date}: {str(e)}")
            return None

    def store_curve(self, curve_data: Dict) -> bool:
        """
        Store bootstrapped curve in database.

        Args:
            curve_data: Curve data dictionary

        Returns:
            True if successful
        """
        try:
            # Check if curve already exists
            existing = self.db.query(BootstrappedCurve).filter_by(
                curve_type=curve_data['curve_type'],
                curve_date=curve_data['curve_date']
            ).first()

            if existing:
                # Update existing curve
                existing.maturities = curve_data['maturities']
                existing.yields = curve_data['yields']
                existing.discount_factors = curve_data.get('discount_factors')
                existing.forward_rates = curve_data.get('forward_rates')
                existing.curve_metadata = {
                    'interpolated_maturities': curve_data.get('interpolated_maturities'),
                    'interpolated_yields': curve_data.get('interpolated_yields'),
                    'interpolation_method': config.BOOTSTRAPPING_INTERPOLATION_METHOD,
                }
            else:
                # Create new curve
                curve = BootstrappedCurve(
                    curve_type=curve_data['curve_type'],
                    curve_date=curve_data['curve_date'],
                    maturities=curve_data['maturities'],
                    yields=curve_data['yields'],
                    discount_factors=curve_data.get('discount_factors'),
                    forward_rates=curve_data.get('forward_rates'),
                    curve_metadata={
                        'interpolated_maturities': curve_data.get('interpolated_maturities'),
                        'interpolated_yields': curve_data.get('interpolated_yields'),
                        'interpolation_method': config.BOOTSTRAPPING_INTERPOLATION_METHOD,
                    }
                )
                self.db.add(curve)

            self.db.commit()
            logger.debug(f"Stored Treasury curve for {curve_data['curve_date']}")
            return True

        except Exception as e:
            logger.error(f"Failed to store curve: {str(e)}")
            self.db.rollback()
            return False

    def build_curves_for_date_range(
        self,
        start_date: date,
        end_date: date
    ) -> Tuple[int, int]:
        """
        Build curves for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Tuple of (successful_count, failed_count)
        """
        logger.info(f"Building Treasury curves from {start_date} to {end_date}")

        # Get all unique dates with data
        dates = self.db.query(RawYieldData.date).filter(
            RawYieldData.data_type == 'treasury',
            RawYieldData.date >= start_date,
            RawYieldData.date <= end_date
        ).distinct().order_by(RawYieldData.date).all()

        unique_dates = [d[0] for d in dates]

        successful = 0
        failed = 0

        for curve_date in unique_dates:
            curve_data = self.build_curve(curve_date)
            if curve_data and self.store_curve(curve_data):
                successful += 1
            else:
                failed += 1

        logger.info(
            f"Built Treasury curves: {successful} successful, {failed} failed"
        )

        return successful, failed

    def get_curve(self, curve_date: date, max_points: Optional[int] = None) -> Optional[Dict]:
        """
        Retrieve stored curve for a specific date.

        Args:
            curve_date: Date of the curve
            max_points: Maximum number of interpolated points to return (for performance)

        Returns:
            Curve data dictionary or None
        """
        curve = self.db.query(BootstrappedCurve).filter_by(
            curve_type='treasury',
            curve_date=curve_date
        ).first()

        if not curve:
            return None

        # Use interpolated curves if available, otherwise use original
        interpolated_maturities = curve.curve_metadata.get('interpolated_maturities') if curve.curve_metadata else None
        interpolated_yields = curve.curve_metadata.get('interpolated_yields') if curve.curve_metadata else None

        # Downsample if requested
        if max_points and interpolated_maturities and len(interpolated_maturities) > max_points:
            import numpy as np
            indices = np.linspace(0, len(interpolated_maturities) - 1, max_points, dtype=int)
            interpolated_maturities = [interpolated_maturities[i] for i in indices]
            interpolated_yields = [interpolated_yields[i] for i in indices]

        return {
            'curve_type': curve.curve_type,
            'curve_date': curve.curve_date.isoformat(),
            'maturities': interpolated_maturities if interpolated_maturities else curve.maturities,
            'yields': interpolated_yields if interpolated_yields else curve.yields,
            'discount_factors': curve.discount_factors,
            'forward_rates': curve.forward_rates,
            'original_maturities': curve.maturities,  # Keep original sparse points
            'original_yields': curve.yields,
        }

    def get_latest_curve(self) -> Optional[Dict]:
        """
        Get the most recent Treasury curve.

        Returns:
            Latest curve data or None
        """
        curve = self.db.query(BootstrappedCurve).filter_by(
            curve_type='treasury'
        ).order_by(BootstrappedCurve.curve_date.desc()).first()

        if not curve:
            return None

        return self.get_curve(curve.curve_date)
