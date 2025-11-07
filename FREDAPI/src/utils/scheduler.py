"""
Scheduler for automatic data refresh.
"""
from datetime import datetime, timedelta, date
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

import config
from src.models.database import SessionLocal, DataUpdateLog
from src.data.fred_client import FREDClient
from src.data.treasury_builder import TreasuryCurveBuilder
from src.data.corporate_builder import CorporateCurveBuilder

logger = logging.getLogger(__name__)


class DataRefreshScheduler:
    """Scheduler for automatic data refresh."""

    def __init__(self, fred_api_key: str):
        """
        Initialize the scheduler.

        Args:
            fred_api_key: FRED API key
        """
        self.fred_api_key = fred_api_key
        self.scheduler = BackgroundScheduler()
        self.is_running = False

    def start(self):
        """Start the scheduler."""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return

        # Schedule daily refresh
        trigger = CronTrigger(
            hour=config.REFRESH_HOUR,
            minute=config.REFRESH_MINUTE
        )

        self.scheduler.add_job(
            self.refresh_all_data,
            trigger=trigger,
            id='daily_refresh',
            name='Daily data refresh',
            replace_existing=True
        )

        self.scheduler.start()
        self.is_running = True

        logger.info(
            f"Scheduler started. Daily refresh at {config.REFRESH_HOUR:02d}:{config.REFRESH_MINUTE:02d}"
        )

    def stop(self):
        """Stop the scheduler."""
        if not self.is_running:
            return

        self.scheduler.shutdown(wait=False)
        self.is_running = False
        logger.info("Scheduler stopped")

    def refresh_all_data(self):
        """
        Refresh all data (Treasury and Corporate).
        This is the main scheduled task.
        """
        logger.info("Starting scheduled data refresh...")

        start_time = datetime.utcnow()
        db = SessionLocal()

        try:
            # Create update log entry
            update_log = DataUpdateLog(
                update_type='scheduled_refresh',
                status='running',
                start_time=start_time,
                log_metadata={'scheduled': True}
            )
            db.add(update_log)
            db.commit()

            # Initialize FRED client
            fred_client = FREDClient(self.fred_api_key)

            # Refresh Treasury data
            treasury_success, treasury_failed = self._refresh_treasury_data(fred_client, db)

            # Refresh Corporate data
            corporate_success, corporate_failed = self._refresh_corporate_data(fred_client, db)

            # Update log
            end_time = datetime.utcnow()
            total_success = treasury_success + corporate_success
            total_failed = treasury_failed + corporate_failed

            update_log.end_time = end_time
            update_log.status = 'success' if total_failed == 0 else 'partial'
            update_log.records_processed = total_success + total_failed
            update_log.records_updated = total_success
            update_log.records_failed = total_failed
            update_log.log_metadata = {
                'scheduled': True,
                'treasury_success': treasury_success,
                'treasury_failed': treasury_failed,
                'corporate_success': corporate_success,
                'corporate_failed': corporate_failed,
                'duration_seconds': (end_time - start_time).total_seconds(),
            }

            db.commit()

            logger.info(
                f"Scheduled refresh complete. "
                f"Success: {total_success}, Failed: {total_failed}, "
                f"Duration: {(end_time - start_time).total_seconds():.1f}s"
            )

        except Exception as e:
            logger.error(f"Scheduled refresh failed: {str(e)}")

            if 'update_log' in locals():
                update_log.status = 'failed'
                update_log.end_time = datetime.utcnow()
                update_log.error_message = str(e)[:500]
                db.commit()

        finally:
            db.close()

    def _refresh_treasury_data(self, fred_client: FREDClient, db) -> tuple:
        """
        Refresh Treasury data.

        Returns:
            Tuple of (successful_count, failed_count)
        """
        logger.info("Refreshing Treasury data...")

        try:
            # Fetch last 30 days of data (to capture any revisions)
            end_date = date.today()
            start_date = end_date - timedelta(days=30)

            df = fred_client.fetch_treasury_data(
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat()
            )

            # Store raw data
            builder = TreasuryCurveBuilder(db)
            builder.store_raw_data(df)

            # Build curves
            successful, failed = builder.build_curves_for_date_range(start_date, end_date)

            logger.info(f"Treasury refresh: {successful} curves built, {failed} failed")
            return successful, failed

        except Exception as e:
            logger.error(f"Treasury data refresh failed: {str(e)}")
            return 0, 1

    def _refresh_corporate_data(self, fred_client: FREDClient, db) -> tuple:
        """
        Refresh Corporate data.

        Returns:
            Tuple of (successful_count, failed_count)
        """
        logger.info("Refreshing Corporate data...")

        try:
            # Fetch last 30 days of data
            end_date = date.today()
            start_date = end_date - timedelta(days=30)

            df = fred_client.fetch_corporate_data(
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat()
            )

            # Store raw data
            builder = CorporateCurveBuilder(db)
            builder.store_raw_data(df)

            # Build curves
            successful, failed = builder.build_curves_for_date_range(start_date, end_date)

            logger.info(f"Corporate refresh: {successful} curves built, {failed} failed")
            return successful, failed

        except Exception as e:
            logger.error(f"Corporate data refresh failed: {str(e)}")
            return 0, 1

    def run_initial_load(self):
        """
        Run initial data load (fetch all historical data).
        This should be run once when first setting up the system.
        """
        logger.info("Starting initial data load...")

        start_time = datetime.utcnow()
        db = SessionLocal()

        try:
            # Create update log
            update_log = DataUpdateLog(
                update_type='initial_load',
                status='running',
                start_time=start_time,
                log_metadata={'initial_load': True}
            )
            db.add(update_log)
            db.commit()

            # Initialize FRED client
            fred_client = FREDClient(self.fred_api_key)

            # Load all Treasury data
            logger.info("Loading all Treasury data...")
            treasury_df = fred_client.fetch_treasury_data()
            treasury_builder = TreasuryCurveBuilder(db)
            treasury_builder.store_raw_data(treasury_df)

            # Build Treasury curves
            if len(treasury_df) > 0:
                start_date = treasury_df.index.min().date()
                end_date = treasury_df.index.max().date()
                treasury_success, treasury_failed = treasury_builder.build_curves_for_date_range(
                    start_date, end_date
                )
            else:
                treasury_success, treasury_failed = 0, 0

            # Load all Corporate data
            logger.info("Loading all Corporate data...")
            corporate_df = fred_client.fetch_corporate_data()
            corporate_builder = CorporateCurveBuilder(db)
            corporate_builder.store_raw_data(corporate_df)

            # Build Corporate curves
            if len(corporate_df) > 0:
                start_date = corporate_df.index.min().date()
                end_date = corporate_df.index.max().date()
                corporate_success, corporate_failed = corporate_builder.build_curves_for_date_range(
                    start_date, end_date
                )
            else:
                corporate_success, corporate_failed = 0, 0

            # Update log
            end_time = datetime.utcnow()
            total_success = treasury_success + corporate_success
            total_failed = treasury_failed + corporate_failed

            update_log.end_time = end_time
            update_log.status = 'success' if total_failed == 0 else 'partial'
            update_log.records_processed = total_success + total_failed
            update_log.records_updated = total_success
            update_log.records_failed = total_failed
            update_log.log_metadata = {
                'initial_load': True,
                'treasury_success': treasury_success,
                'treasury_failed': treasury_failed,
                'corporate_success': corporate_success,
                'corporate_failed': corporate_failed,
                'duration_seconds': (end_time - start_time).total_seconds(),
            }

            db.commit()

            logger.info(
                f"Initial load complete. "
                f"Success: {total_success}, Failed: {total_failed}, "
                f"Duration: {(end_time - start_time).total_seconds():.1f}s"
            )

            return True

        except Exception as e:
            logger.error(f"Initial load failed: {str(e)}")

            if 'update_log' in locals():
                update_log.status = 'failed'
                update_log.end_time = datetime.utcnow()
                update_log.error_message = str(e)[:500]
                db.commit()

            return False

        finally:
            db.close()
