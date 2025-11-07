"""
API routes for Treasury and Corporate Bond Curve API.
"""
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from src.models.database import get_db, BootstrappedCurve, CorporateSpreadCurve, RawYieldData
from src.data.treasury_builder import TreasuryCurveBuilder
from src.data.corporate_builder import CorporateCurveBuilder

router = APIRouter()


# Response models
class CurveResponse(BaseModel):
    """Response model for yield curves."""
    curve_type: str = Field(..., description="Type of curve (treasury or corporate)")
    curve_date: str = Field(..., description="Date of the curve (YYYY-MM-DD)")
    maturities: List[float] = Field(..., description="Maturities in years")
    yields: List[float] = Field(..., description="Yields in percentage")
    discount_factors: Optional[List[float]] = Field(None, description="Discount factors")
    forward_rates: Optional[List[float]] = Field(None, description="Forward rates")
    interpolated_maturities: Optional[List[float]] = Field(None, description="Interpolated maturities (daily)")
    interpolated_yields: Optional[List[float]] = Field(None, description="Interpolated yields (daily)")


class SpreadCurveResponse(BaseModel):
    """Response model for spread curves."""
    rating: str = Field(..., description="Credit rating")
    curve_date: str = Field(..., description="Date of the curve (YYYY-MM-DD)")
    maturities: List[float] = Field(..., description="Maturities in years")
    spreads: List[float] = Field(..., description="Spreads over treasuries (bps)")
    yields: List[float] = Field(..., description="Absolute yields")
    treasury_yields: Optional[List[float]] = Field(None, description="Corresponding treasury yields")


class RawDataResponse(BaseModel):
    """Response model for raw yield data."""
    series_id: str
    series_name: str
    data_type: str
    date: str
    value: Optional[float]


class AvailableDatesResponse(BaseModel):
    """Response model for available dates."""
    curve_type: str
    start_date: str
    end_date: str
    total_dates: int


# Treasury endpoints
@router.get("/treasury/latest", response_model=CurveResponse, tags=["Treasury"])
async def get_latest_treasury_curve(
    max_points: int = Query(300, description="Max interpolated points to return (for performance)"),
    db: Session = Depends(get_db)
):
    """
    Get the latest US Treasury yield curve.

    Returns the most recent bootstrapped Treasury curve with interpolated daily granularity.
    Use max_points parameter to control response size (default: 300 points is smooth enough for visualization).
    """
    builder = TreasuryCurveBuilder(db)
    curve = builder.get_latest_curve()

    if not curve:
        raise HTTPException(status_code=404, detail="No Treasury curve data available")

    # Apply downsampling if needed
    if max_points and curve:
        curve_date = curve.get('curve_date')
        curve = builder.get_curve(datetime.fromisoformat(curve_date).date(), max_points=max_points)

    return curve


@router.get("/treasury/{curve_date}", response_model=CurveResponse, tags=["Treasury"])
async def get_treasury_curve(
    curve_date: date = Path(..., description="Date in YYYY-MM-DD format"),
    max_points: int = Query(300, description="Max interpolated points to return"),
    db: Session = Depends(get_db)
):
    """
    Get US Treasury yield curve for a specific date.

    Returns the bootstrapped Treasury curve for the requested date.
    Use max_points parameter to control response size (default: 300 points).
    """
    builder = TreasuryCurveBuilder(db)
    curve = builder.get_curve(curve_date, max_points=max_points)

    if not curve:
        raise HTTPException(
            status_code=404,
            detail=f"No Treasury curve data available for {curve_date}"
        )

    return curve


@router.get("/treasury/range/{start_date}/{end_date}", response_model=List[CurveResponse], tags=["Treasury"])
async def get_treasury_curve_range(
    start_date: date = Path(..., description="Start date in YYYY-MM-DD format"),
    end_date: date = Path(..., description="End date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """
    Get US Treasury yield curves for a date range.

    Returns all available Treasury curves between start_date and end_date.
    """
    curves = db.query(BootstrappedCurve).filter(
        BootstrappedCurve.curve_type == 'treasury',
        BootstrappedCurve.curve_date >= start_date,
        BootstrappedCurve.curve_date <= end_date
    ).order_by(BootstrappedCurve.curve_date).all()

    if not curves:
        raise HTTPException(
            status_code=404,
            detail=f"No Treasury curves found between {start_date} and {end_date}"
        )

    builder = TreasuryCurveBuilder(db)
    return [builder.get_curve(curve.curve_date) for curve in curves]


@router.get("/treasury/{curve_date}/yield/{maturity}", tags=["Treasury"])
async def get_treasury_yield_at_maturity(
    curve_date: date = Path(..., description="Date in YYYY-MM-DD format"),
    maturity: float = Path(..., description="Maturity in years (e.g., 10.0055 for 10Y and 2 days)"),
    db: Session = Depends(get_db)
):
    """
    Get interpolated Treasury yield for any specific maturity.

    This endpoint uses the bootstrapped curve to return the yield for ANY maturity,
    not just the standard tenors. For example, you can query 10.0055 years to get
    the rate for 10 years and 2 days.

    Returns:
        Interpolated yield at the specified maturity
    """
    from scipy.interpolate import interp1d
    import numpy as np

    builder = TreasuryCurveBuilder(db)
    curve = builder.get_curve(curve_date)

    if not curve:
        raise HTTPException(
            status_code=404,
            detail=f"No Treasury curve data available for {curve_date}"
        )

    # Use interpolated curve if available
    maturities = curve.get('maturities', [])
    yields = curve.get('yields', [])

    if not maturities or not yields:
        raise HTTPException(
            status_code=404,
            detail="No yield curve data available"
        )

    # Check if maturity is within bounds
    min_mat = min(maturities)
    max_mat = max(maturities)

    if maturity < min_mat or maturity > max_mat:
        raise HTTPException(
            status_code=400,
            detail=f"Maturity {maturity} is outside available range [{min_mat}, {max_mat}]"
        )

    # Interpolate to find yield at requested maturity
    interpolator = interp1d(maturities, yields, kind='cubic', fill_value='extrapolate')
    interpolated_yield = float(interpolator(maturity))

    return {
        'curve_date': curve_date.isoformat(),
        'maturity': maturity,
        'yield': round(interpolated_yield, 6),
        'curve_type': 'treasury',
        'interpolation_method': 'cubic'
    }


# Corporate endpoints
@router.get("/corporate/latest", response_model=CurveResponse, tags=["Corporate"])
async def get_latest_corporate_curve(
    max_points: int = Query(300, description="Max interpolated points to return"),
    db: Session = Depends(get_db)
):
    """
    Get the latest corporate bond yield curve.

    Returns the most recent bootstrapped corporate bond curve.
    """
    builder = CorporateCurveBuilder(db)
    curve = builder.get_latest_curve()

    if not curve:
        raise HTTPException(status_code=404, detail="No Corporate curve data available")

    # Apply downsampling if needed
    if max_points and curve:
        curve_date = curve.get('curve_date')
        curve = builder.get_curve(datetime.fromisoformat(curve_date).date(), max_points=max_points)

    return curve


@router.get("/corporate/{curve_date}", response_model=CurveResponse, tags=["Corporate"])
async def get_corporate_curve(
    curve_date: date = Path(..., description="Date in YYYY-MM-DD format"),
    max_points: int = Query(300, description="Max interpolated points to return"),
    db: Session = Depends(get_db)
):
    """
    Get corporate bond yield curve for a specific date.

    Returns the bootstrapped corporate curve for the requested date.
    """
    builder = CorporateCurveBuilder(db)
    curve = builder.get_curve(curve_date, max_points=max_points)

    if not curve:
        raise HTTPException(
            status_code=404,
            detail=f"No Corporate curve data available for {curve_date}"
        )

    return curve


@router.get("/corporate/{curve_date}/yield/{maturity}", tags=["Corporate"])
async def get_corporate_yield_at_maturity(
    curve_date: date = Path(..., description="Date in YYYY-MM-DD format"),
    maturity: float = Path(..., description="Maturity in years (e.g., 10.0055 for 10Y and 2 days)"),
    db: Session = Depends(get_db)
):
    """
    Get interpolated Corporate bond yield for any specific maturity.

    This endpoint uses the bootstrapped curve to return the yield for ANY maturity,
    not just the standard tenors.

    Returns:
        Interpolated yield at the specified maturity
    """
    from scipy.interpolate import interp1d
    import numpy as np

    builder = CorporateCurveBuilder(db)
    curve = builder.get_curve(curve_date)

    if not curve:
        raise HTTPException(
            status_code=404,
            detail=f"No Corporate curve data available for {curve_date}"
        )

    # Use interpolated curve if available
    maturities = curve.get('maturities', [])
    yields = curve.get('yields', [])

    if not maturities or not yields:
        raise HTTPException(
            status_code=404,
            detail="No yield curve data available"
        )

    # Check if maturity is within bounds
    min_mat = min(maturities)
    max_mat = max(maturities)

    if maturity < min_mat or maturity > max_mat:
        raise HTTPException(
            status_code=400,
            detail=f"Maturity {maturity} is outside available range [{min_mat}, {max_mat}]"
        )

    # Interpolate to find yield at requested maturity
    interpolator = interp1d(maturities, yields, kind='cubic', fill_value='extrapolate')
    interpolated_yield = float(interpolator(maturity))

    return {
        'curve_date': curve_date.isoformat(),
        'maturity': maturity,
        'yield': round(interpolated_yield, 6),
        'curve_type': 'corporate',
        'interpolation_method': 'cubic'
    }


@router.get("/corporate/spread/{rating}/latest", response_model=SpreadCurveResponse, tags=["Corporate"])
async def get_latest_spread_curve(
    rating: str = Path(..., description="Credit rating (e.g., AAA, BAA)"),
    db: Session = Depends(get_db)
):
    """
    Get the latest spread curve for a specific credit rating.

    Returns spreads over treasuries for the specified rating.
    """
    spread_curve = db.query(CorporateSpreadCurve).filter_by(
        rating=rating
    ).order_by(CorporateSpreadCurve.curve_date.desc()).first()

    if not spread_curve:
        raise HTTPException(
            status_code=404,
            detail=f"No spread curve data available for rating {rating}"
        )

    builder = CorporateCurveBuilder(db)
    return builder.get_spread_curve(rating, spread_curve.curve_date)


@router.get("/corporate/spread/{rating}/{curve_date}", response_model=SpreadCurveResponse, tags=["Corporate"])
async def get_spread_curve(
    rating: str = Path(..., description="Credit rating"),
    curve_date: date = Path(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """
    Get spread curve for a specific rating and date.

    Returns spreads over treasuries for the specified rating and date.
    """
    builder = CorporateCurveBuilder(db)
    spread_curve = builder.get_spread_curve(rating, curve_date)

    if not spread_curve:
        raise HTTPException(
            status_code=404,
            detail=f"No spread curve data available for {rating} on {curve_date}"
        )

    return spread_curve


# Raw data endpoints
@router.get("/raw/treasury/{series_name}", response_model=List[RawDataResponse], tags=["Raw Data"])
async def get_raw_treasury_data(
    series_name: str = Path(..., description="Series name (e.g., 1M, 3M, 10Y)"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    limit: int = Query(1000, le=10000, description="Maximum number of records"),
    db: Session = Depends(get_db)
):
    """
    Get raw Treasury data for a specific series.

    Returns raw yield data from FRED for the specified Treasury series.
    """
    query = db.query(RawYieldData).filter(
        RawYieldData.data_type == 'treasury',
        RawYieldData.series_name == series_name
    )

    if start_date:
        query = query.filter(RawYieldData.date >= start_date)
    if end_date:
        query = query.filter(RawYieldData.date <= end_date)

    data = query.order_by(RawYieldData.date.desc()).limit(limit).all()

    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No raw data available for {series_name}"
        )

    return [
        {
            'series_id': d.series_id,
            'series_name': d.series_name,
            'data_type': d.data_type,
            'date': d.date.isoformat(),
            'value': d.value,
        }
        for d in data
    ]


@router.get("/raw/corporate/{series_name}", response_model=List[RawDataResponse], tags=["Raw Data"])
async def get_raw_corporate_data(
    series_name: str = Path(..., description="Series name (e.g., AAA, BAA)"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    limit: int = Query(1000, le=10000, description="Maximum number of records"),
    db: Session = Depends(get_db)
):
    """
    Get raw corporate data for a specific series.

    Returns raw yield data from FRED for the specified corporate bond series.
    """
    query = db.query(RawYieldData).filter(
        RawYieldData.data_type == 'corporate',
        RawYieldData.series_name == series_name
    )

    if start_date:
        query = query.filter(RawYieldData.date >= start_date)
    if end_date:
        query = query.filter(RawYieldData.date <= end_date)

    data = query.order_by(RawYieldData.date.desc()).limit(limit).all()

    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No raw data available for {series_name}"
        )

    return [
        {
            'series_id': d.series_id,
            'series_name': d.series_name,
            'data_type': d.data_type,
            'date': d.date.isoformat(),
            'value': d.value,
        }
        for d in data
    ]


# Metadata endpoints
@router.get("/dates/available", response_model=List[AvailableDatesResponse], tags=["Metadata"])
async def get_available_dates(db: Session = Depends(get_db)):
    """
    Get information about available curve dates.

    Returns the date range and count for both Treasury and Corporate curves.
    """
    results = []

    for curve_type in ['treasury', 'corporate']:
        curves = db.query(BootstrappedCurve).filter_by(
            curve_type=curve_type
        ).order_by(BootstrappedCurve.curve_date).all()

        if curves:
            results.append({
                'curve_type': curve_type,
                'start_date': curves[0].curve_date.isoformat(),
                'end_date': curves[-1].curve_date.isoformat(),
                'total_dates': len(curves),
            })

    if not results:
        raise HTTPException(status_code=404, detail="No curve data available")

    return results


@router.get("/health", tags=["Metadata"])
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.

    Returns API status and database connectivity.
    """
    try:
        # Check database connection
        db.execute("SELECT 1")

        # Get latest data dates
        latest_treasury = db.query(BootstrappedCurve).filter_by(
            curve_type='treasury'
        ).order_by(BootstrappedCurve.curve_date.desc()).first()

        latest_corporate = db.query(BootstrappedCurve).filter_by(
            curve_type='corporate'
        ).order_by(BootstrappedCurve.curve_date.desc()).first()

        return {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'latest_treasury_date': latest_treasury.curve_date.isoformat() if latest_treasury else None,
            'latest_corporate_date': latest_corporate.curve_date.isoformat() if latest_corporate else None,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")
