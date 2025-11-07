"""
Main application entry point for Treasury & Corporate Bond Curve Builder.
"""
import sys
import os
import logging
from pathlib import Path
import argparse
import getpass
import uvicorn

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

import config
from src.utils.logger import setup_logging
from src.models.database import init_database
from src.data.fred_client import FREDClient
from src.utils.scheduler import DataRefreshScheduler

logger = None


def prompt_for_api_key() -> str:
    """
    Prompt user for FRED API key.

    Returns:
        API key string
    """
    print("\n" + "="*60)
    print("Treasury & Corporate Bond Curve Builder")
    print("="*60)
    print("\nThis application requires a FRED API key.")
    print("Get your free API key at: https://fred.stlouisfed.org/docs/api/api_key.html")
    print()

    api_key = "a143fd9d578f3d3c2193211b5e96b524"

    if not api_key:
        print("Error: API key cannot be empty")
        sys.exit(1)

    return api_key


def validate_api_key(api_key: str) -> bool:
    """
    Validate FRED API key.

    Args:
        api_key: API key to validate

    Returns:
        True if valid, False otherwise
    """
    logger.info("Validating FRED API key...")

    try:
        client = FREDClient(api_key)
        if client.validate_api_key():
            logger.info("API key validated successfully")
            return True
        else:
            logger.error("API key validation failed")
            return False
    except Exception as e:
        logger.error(f"API key validation error: {str(e)}")
        return False


def initialize_system(api_key: str, skip_initial_load: bool = False) -> DataRefreshScheduler:
    """
    Initialize the system.

    Args:
        api_key: FRED API key
        skip_initial_load: Skip initial data load if True

    Returns:
        DataRefreshScheduler instance
    """
    logger.info("Initializing system...")

    # Initialize database
    logger.info("Initializing database...")
    init_database()

    # Set API key in config
    config.FRED_API_KEY = api_key

    # Create scheduler
    scheduler = DataRefreshScheduler(api_key)

    # Run initial data load if needed
    if not skip_initial_load:
        print("\n" + "="*60)
        print("Initial Data Load")
        print("="*60)
        print("\nThis will fetch all historical data from FRED.")
        print("This may take several minutes on first run.")
        response = input("\nProceed with initial data load? (yes/no): ").strip().lower()

        if response in ['yes', 'y']:
            logger.info("Starting initial data load...")
            print("\nLoading data... This may take a few minutes.")
            success = scheduler.run_initial_load()

            if success:
                print("\n✓ Initial data load completed successfully!")
                logger.info("Initial data load completed")
            else:
                print("\n✗ Initial data load failed. Check logs for details.")
                logger.error("Initial data load failed")
        else:
            logger.info("Skipping initial data load")
            print("\nSkipping initial data load.")

    return scheduler


def start_api_server(scheduler: DataRefreshScheduler):
    """
    Start the API server.

    Args:
        scheduler: DataRefreshScheduler instance
    """
    print("\n" + "="*60)
    print("Starting API Server")
    print("="*60)
    print(f"\nAPI will be available at: http://{config.API_HOST}:{config.API_PORT}")
    print(f"API Documentation: http://{config.API_HOST}:{config.API_PORT}/docs")
    print(f"Daily data refresh scheduled for: {config.REFRESH_HOUR:02d}:{config.REFRESH_MINUTE:02d}")
    print("\nPress Ctrl+C to stop the server")
    print("="*60 + "\n")

    # Start scheduler
    scheduler.start()
    logger.info("Scheduler started")

    # Start API server
    try:
        uvicorn.run(
            "src.api.app:app",
            host=config.API_HOST,
            port=config.API_PORT,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
        scheduler.stop()
        print("\n\nServer stopped.")
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        scheduler.stop()
        raise


def main():
    """Main entry point."""
    global logger

    parser = argparse.ArgumentParser(
        description="Treasury & Corporate Bond Curve Builder with API"
    )
    parser.add_argument(
        "--api-key",
        type=str,
        help="FRED API key (will prompt if not provided)"
    )
    parser.add_argument(
        "--skip-initial-load",
        action="store_true",
        help="Skip initial data load"
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging level"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=config.API_PORT,
        help=f"API server port (default: {config.API_PORT})"
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    logger.info("Starting Treasury & Corporate Bond Curve Builder")

    # Update config with command-line args
    if args.port:
        config.API_PORT = args.port

    # Get API key
    api_key = args.api_key
    if not api_key:
        api_key = prompt_for_api_key()

    # Validate API key
    if not validate_api_key(api_key):
        print("\n✗ Invalid API key. Please check your key and try again.")
        logger.error("Invalid API key")
        sys.exit(1)

    print("\n✓ API key validated successfully!")

    # Initialize system
    try:
        scheduler = initialize_system(api_key, args.skip_initial_load)
    except Exception as e:
        logger.error(f"System initialization failed: {str(e)}")
        print(f"\n✗ System initialization failed: {str(e)}")
        sys.exit(1)

    # Start API server
    try:
        start_api_server(scheduler)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        print(f"\n✗ Failed to start server: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
