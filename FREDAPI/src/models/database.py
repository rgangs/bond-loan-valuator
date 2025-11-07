"""
Database models for storing yield curve data.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Date, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import config

Base = declarative_base()


class RawYieldData(Base):
    """Raw yield data from FRED API."""
    __tablename__ = "raw_yield_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    series_id = Column(String(50), nullable=False, index=True)
    series_name = Column(String(100), nullable=False)
    data_type = Column(String(20), nullable=False)  # 'treasury' or 'corporate'
    date = Column(Date, nullable=False, index=True)
    value = Column(Float, nullable=True)  # Can be null for missing data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('series_id', 'date', name='uix_series_date'),
    )


class BootstrappedCurve(Base):
    """Bootstrapped yield curves."""
    __tablename__ = "bootstrapped_curves"

    id = Column(Integer, primary_key=True, autoincrement=True)
    curve_type = Column(String(20), nullable=False, index=True)  # 'treasury' or 'corporate'
    curve_date = Column(Date, nullable=False, index=True)
    maturities = Column(JSON, nullable=False)  # List of maturities in years
    yields = Column(JSON, nullable=False)  # List of corresponding yields
    discount_factors = Column(JSON, nullable=True)  # Optional discount factors
    forward_rates = Column(JSON, nullable=True)  # Optional forward rates
    curve_metadata = Column(JSON, nullable=True)  # Additional metadata (interpolation method, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('curve_type', 'curve_date', name='uix_curve_type_date'),
    )


class CorporateSpreadCurve(Base):
    """Corporate spread curves over treasuries."""
    __tablename__ = "corporate_spread_curves"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rating = Column(String(20), nullable=False, index=True)  # AAA, BAA, etc.
    curve_date = Column(Date, nullable=False, index=True)
    maturities = Column(JSON, nullable=False)  # List of maturities in years
    spreads = Column(JSON, nullable=False)  # List of spreads over treasuries
    yields = Column(JSON, nullable=False)  # Absolute yields (treasury + spread)
    curve_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('rating', 'curve_date', name='uix_rating_curve_date'),
    )


class DataUpdateLog(Base):
    """Log of data update operations."""
    __tablename__ = "data_update_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    update_type = Column(String(50), nullable=False)  # 'full_refresh', 'incremental', etc.
    status = Column(String(20), nullable=False)  # 'success', 'failed', 'partial'
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    records_processed = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_message = Column(String(500), nullable=True)
    log_metadata = Column(JSON, nullable=True)


# Database engine and session
engine = create_engine(config.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_database():
    """Initialize the database by creating all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session (for dependency injection)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
