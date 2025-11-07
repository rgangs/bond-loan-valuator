"""
Verify that all required packages are installed correctly.
"""
import sys

def verify_imports():
    """Test all critical imports."""
    print("Verifying package installations...\n")

    packages = [
        ("FastAPI", "fastapi"),
        ("Uvicorn", "uvicorn"),
        ("Pydantic", "pydantic"),
        ("FRED API", "fredapi"),
        ("NumPy", "numpy"),
        ("Pandas", "pandas"),
        ("SciPy", "scipy"),
        ("SQLAlchemy", "sqlalchemy"),
        ("Alembic", "alembic"),
        ("APScheduler", "apscheduler"),
        ("Colorlog", "colorlog"),
        ("Python Dotenv", "dotenv"),
        ("Requests", "requests"),
    ]

    failed = []

    for name, module in packages:
        try:
            __import__(module)
            print(f"[OK]   {name:20}")
        except ImportError as e:
            print(f"[FAIL] {name:20} - {str(e)}")
            failed.append(name)

    print("\n" + "="*50)
    if not failed:
        print("All packages installed successfully!")
        print("You're ready to run the application.")
        return True
    else:
        print(f"Failed packages: {', '.join(failed)}")
        print("Please run: pip install -r requirements.txt")
        return False


if __name__ == "__main__":
    success = verify_imports()
    sys.exit(0 if success else 1)
