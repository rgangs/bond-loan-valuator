"""
FastAPI application for Treasury and Corporate Bond Curve API.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import config

# Create FastAPI app
app = FastAPI(
    title=config.API_TITLE,
    version=config.API_VERSION,
    description=config.API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add GZip compression middleware (compress responses > 1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from src.api.routes import router
app.include_router(router, prefix="/api/v1")

# Mount static files
STATIC_DIR = Path(__file__).parent.parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """Serve the dashboard homepage."""
    html_file = STATIC_DIR / "index.html"
    if html_file.exists():
        return FileResponse(str(html_file))
    return {
        "name": config.API_TITLE,
        "version": config.API_VERSION,
        "description": "API for accessing US Treasury and Corporate Bond yield curves",
        "dashboard": "/",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.on_event("startup")
async def startup_event():
    """Initialize on startup."""
    from src.models.database import init_database
    import logging

    logger = logging.getLogger(__name__)
    logger.info("Starting Bond Curve API...")

    # Initialize database
    init_database()
    logger.info("Database initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Shutting down Bond Curve API...")
