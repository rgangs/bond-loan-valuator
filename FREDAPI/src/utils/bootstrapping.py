"""
Bootstrapping algorithm for yield curve construction.
"""
from typing import List, Tuple, Dict, Optional
import numpy as np
from scipy.interpolate import CubicSpline, interp1d
import logging

logger = logging.getLogger(__name__)


class YieldCurveBootstrapper:
    """Bootstrap yield curves from market data."""

    def __init__(self, interpolation_method: str = "cubic"):
        """
        Initialize bootstrapper.

        Args:
            interpolation_method: Interpolation method ('cubic', 'linear', 'quadratic')
        """
        self.interpolation_method = interpolation_method

    def bootstrap_zero_curve(
        self,
        maturities: List[float],
        yields: List[float]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Bootstrap zero-coupon curve from par yields.

        Args:
            maturities: List of maturities in years
            yields: List of corresponding yields (as percentages, e.g., 4.5 for 4.5%)

        Returns:
            Tuple of (zero_rates, discount_factors, forward_rates)
        """
        if len(maturities) != len(yields):
            raise ValueError("Maturities and yields must have the same length")

        if len(maturities) < 2:
            raise ValueError("Need at least 2 data points for bootstrapping")

        # Sort by maturity
        sorted_indices = np.argsort(maturities)
        maturities = np.array(maturities)[sorted_indices]
        yields = np.array(yields)[sorted_indices]

        # Remove any NaN values
        valid_mask = ~(np.isnan(maturities) | np.isnan(yields))
        maturities = maturities[valid_mask]
        yields = yields[valid_mask]

        if len(maturities) < 2:
            raise ValueError("Not enough valid data points after removing NaNs")

        # For simplicity, we'll treat the input yields as zero rates
        # In a more sophisticated implementation, you would bootstrap from par yields
        zero_rates = yields.copy()

        # Calculate discount factors
        discount_factors = np.exp(-zero_rates / 100.0 * maturities)

        # Calculate forward rates
        forward_rates = self._calculate_forward_rates(maturities, zero_rates)

        logger.debug(f"Bootstrapped curve with {len(maturities)} points")

        return zero_rates, discount_factors, forward_rates

    def interpolate_curve(
        self,
        maturities: List[float],
        rates: List[float],
        target_maturities: Optional[List[float]] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Interpolate yield curve to daily granularity.

        Args:
            maturities: Original maturities
            rates: Original rates
            target_maturities: Target maturities for interpolation.
                             If None, creates daily points from min to max maturity.

        Returns:
            Tuple of (interpolated_maturities, interpolated_rates)
        """
        maturities = np.array(maturities)
        rates = np.array(rates)

        # Remove NaN values
        valid_mask = ~(np.isnan(maturities) | np.isnan(rates))
        maturities = maturities[valid_mask]
        rates = rates[valid_mask]

        if len(maturities) < 2:
            raise ValueError("Need at least 2 valid points for interpolation")

        # Sort by maturity
        sorted_indices = np.argsort(maturities)
        maturities = maturities[sorted_indices]
        rates = rates[sorted_indices]

        # Create target maturities if not provided
        if target_maturities is None:
            # Create daily granularity (365 points per year)
            min_maturity = maturities[0]
            max_maturity = maturities[-1]
            num_points = int((max_maturity - min_maturity) * 365) + 1
            target_maturities = np.linspace(min_maturity, max_maturity, num_points)
        else:
            target_maturities = np.array(target_maturities)

        # Perform interpolation
        if self.interpolation_method == "cubic" and len(maturities) >= 4:
            interpolator = CubicSpline(maturities, rates, extrapolate=False)
        elif self.interpolation_method == "quadratic" and len(maturities) >= 3:
            interpolator = interp1d(maturities, rates, kind='quadratic', fill_value='extrapolate')
        else:
            interpolator = interp1d(maturities, rates, kind='linear', fill_value='extrapolate')

        interpolated_rates = interpolator(target_maturities)

        # Clip to reasonable bounds (prevent negative rates unless they exist in original data)
        min_rate = min(rates.min(), 0)  # Allow negative rates if present in data
        max_rate = rates.max() * 1.5  # Allow some extrapolation
        interpolated_rates = np.clip(interpolated_rates, min_rate, max_rate)

        logger.debug(
            f"Interpolated curve from {len(maturities)} to {len(target_maturities)} points"
        )

        return target_maturities, interpolated_rates

    def _calculate_forward_rates(
        self,
        maturities: np.ndarray,
        zero_rates: np.ndarray
    ) -> np.ndarray:
        """
        Calculate instantaneous forward rates from zero rates.

        Args:
            maturities: Maturities in years
            zero_rates: Zero rates

        Returns:
            Forward rates
        """
        if len(maturities) < 2:
            return zero_rates.copy()

        forward_rates = np.zeros_like(zero_rates)
        forward_rates[0] = zero_rates[0]

        for i in range(1, len(maturities)):
            t1 = maturities[i - 1]
            t2 = maturities[i]
            r1 = zero_rates[i - 1] / 100.0
            r2 = zero_rates[i] / 100.0

            # Forward rate calculation
            if t2 > t1:
                forward_rate = ((r2 * t2 - r1 * t1) / (t2 - t1)) * 100.0
                forward_rates[i] = forward_rate
            else:
                forward_rates[i] = zero_rates[i]

        return forward_rates

    def calculate_spreads(
        self,
        corporate_yields: List[float],
        treasury_yields: List[float]
    ) -> np.ndarray:
        """
        Calculate credit spreads (corporate - treasury).

        Args:
            corporate_yields: Corporate bond yields
            treasury_yields: Treasury yields

        Returns:
            Array of spreads
        """
        corporate = np.array(corporate_yields)
        treasury = np.array(treasury_yields)

        if len(corporate) != len(treasury):
            raise ValueError("Corporate and treasury yield arrays must have the same length")

        spreads = corporate - treasury

        return spreads

    def smooth_curve(
        self,
        maturities: List[float],
        rates: List[float],
        smoothing_factor: float = 0.1
    ) -> np.ndarray:
        """
        Apply smoothing to yield curve to remove noise.

        Args:
            maturities: Maturities
            rates: Rates
            smoothing_factor: Smoothing strength (0-1, higher = more smoothing)

        Returns:
            Smoothed rates
        """
        maturities = np.array(maturities)
        rates = np.array(rates)

        if len(rates) < 3:
            return rates

        # Simple moving average smoothing
        window_size = max(3, int(len(rates) * smoothing_factor))
        if window_size % 2 == 0:
            window_size += 1

        smoothed = rates.copy()
        half_window = window_size // 2

        for i in range(half_window, len(rates) - half_window):
            smoothed[i] = np.mean(rates[i - half_window:i + half_window + 1])

        return smoothed


def validate_curve_data(
    maturities: List[float],
    yields: List[float],
    min_points: int = 3
) -> Tuple[bool, str]:
    """
    Validate curve data for bootstrapping.

    Args:
        maturities: List of maturities
        yields: List of yields
        min_points: Minimum required data points

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(maturities) != len(yields):
        return False, "Maturities and yields have different lengths"

    if len(maturities) < min_points:
        return False, f"Insufficient data points (need at least {min_points})"

    # Check for valid numbers
    try:
        maturities = np.array(maturities, dtype=float)
        yields = np.array(yields, dtype=float)
    except (ValueError, TypeError):
        return False, "Maturities and yields must be numeric"

    # Check for negative maturities
    if np.any(maturities < 0):
        return False, "Maturities cannot be negative"

    # Count valid (non-NaN) points
    valid_count = np.sum(~(np.isnan(maturities) | np.isnan(yields)))
    if valid_count < min_points:
        return False, f"Insufficient valid data points (need at least {min_points})"

    # Check for duplicate maturities
    unique_maturities = np.unique(maturities[~np.isnan(maturities)])
    if len(unique_maturities) < valid_count:
        return False, "Duplicate maturities detected"

    return True, ""
