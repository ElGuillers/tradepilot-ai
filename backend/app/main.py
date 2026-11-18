import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.database.session import init_db
from app.alerts.scanner import run_market_scanner
from app.api.health import router as health_router
from app.api.markets import router as markets_router
from app.api.indicators import router as indicators_router
from app.api.signals import router as signals_router
from app.api.alerts import router as alerts_router
from app.api.ai import router as ai_router
from app.api.backtesting import router as backtesting_router
from app.api.risk import router as risk_router
from app.api.settings import router as settings_router
from app.api.ws import router as ws_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("tradepilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TradePilot AI database...")
    await init_db()
    logger.info("Starting background autonomous market scanner...")
    scanner_task = asyncio.create_task(run_market_scanner())
    logger.info("TradePilot AI startup complete.")
    yield
    logger.info("TradePilot AI shutting down...")
    scanner_task.cancel()
    try:
        await scanner_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plataforma de análisis de mercados financieros con análisis técnico e IA.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ha ocurrido un error interno en el servidor de TradePilot AI."}
    )


# Register API routers
prefix = settings.API_V1_PREFIX
app.include_router(health_router, prefix=prefix)
app.include_router(markets_router, prefix=prefix)
app.include_router(indicators_router, prefix=prefix)
app.include_router(signals_router, prefix=prefix)
app.include_router(alerts_router, prefix=prefix)
app.include_router(ai_router, prefix=prefix)
app.include_router(backtesting_router, prefix=prefix)
app.include_router(risk_router, prefix=prefix)
app.include_router(settings_router, prefix=prefix)
app.include_router(ws_router, prefix=prefix)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{prefix}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
