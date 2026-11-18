from fastapi import APIRouter
from app.core.config import settings
from app.market_data.manager import market_data_manager
from app.ai.manager import ai_manager

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    providers_status = await market_data_manager.check_all_providers()
    ai_status = ai_manager.get_status()

    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "providers": providers_status,
        "ai": ai_status,
        "features": {
            "real_trading_enabled": False,
            "disclaimer": "Plataforma de análisis cuantitativo y alertas. Operaciones reales prohibidas."
        }
    }
