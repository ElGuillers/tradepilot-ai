import os
from pathlib import Path
import httpx
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import settings
from app.market_data.manager import market_data_manager
from app.ai.manager import ai_manager

router = APIRouter(tags=["Settings"])


def _persist_to_env(updates: Dict[str, str]) -> None:
    """Updates key-value pairs in the .env file permanently."""
    env_paths = [
        Path(__file__).resolve().parent.parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env"
    ]
    for env_path in env_paths:
        try:
            lines = []
            existing_keys = set()
            if env_path.exists():
                lines = env_path.read_text(encoding="utf-8").splitlines()

            new_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key = stripped.split("=", 1)[0].strip()
                    if key in updates:
                        new_lines.append(f"{key}={updates[key]}")
                        existing_keys.add(key)
                        continue
                new_lines.append(line)

            # Append any keys that weren't already in the file
            for k, v in updates.items():
                if k not in existing_keys:
                    new_lines.append(f"{k}={v}")

            env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        except Exception:
            pass


class TelegramTestRequest(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None


class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ai_provider: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_auto_alerts: Optional[bool] = None
    telegram_min_score: Optional[float] = None
    default_risk_percent: Optional[float] = None
    default_account_balance: Optional[float] = None


@router.get("/settings")
async def get_settings():
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
        "telegram_configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID),
        "telegram_bot_token": settings.TELEGRAM_BOT_TOKEN,
        "telegram_chat_id": settings.TELEGRAM_CHAT_ID,
        "telegram_auto_alerts": settings.TELEGRAM_AUTO_ALERTS,
        "telegram_min_score": settings.TELEGRAM_MIN_SCORE,
        "default_risk_percent": settings.DEFAULT_RISK_PER_TRADE_PERCENT,
        "default_account_balance": settings.DEFAULT_ACCOUNT_BALANCE,
        "min_risk_reward_ratio": settings.MIN_RISK_REWARD_RATIO,
        "binance_base_url": settings.BINANCE_API_BASE,
        "prohibited_actions": [
            "Ejecución de órdenes reales en exchanges",
            "Conexión de claves de trading o retiro",
            "Gestión directa de fondos de clientes"
        ]
    }


@router.post("/settings")
async def update_settings(update: SettingsUpdate):
    env_updates: Dict[str, str] = {}

    if update.gemini_api_key is not None:
        settings.GEMINI_API_KEY = update.gemini_api_key
        ai_manager.gemini_provider.api_key = update.gemini_api_key
        env_updates["GEMINI_API_KEY"] = update.gemini_api_key
    if update.anthropic_api_key is not None:
        settings.ANTHROPIC_API_KEY = update.anthropic_api_key
        ai_manager.claude_provider.api_key = update.anthropic_api_key
        env_updates["ANTHROPIC_API_KEY"] = update.anthropic_api_key
    if update.ai_provider is not None:
        settings.AI_PROVIDER = update.ai_provider
        env_updates["AI_PROVIDER"] = update.ai_provider
    if update.telegram_bot_token is not None:
        settings.TELEGRAM_BOT_TOKEN = update.telegram_bot_token
        env_updates["TELEGRAM_BOT_TOKEN"] = update.telegram_bot_token
    if update.telegram_chat_id is not None:
        settings.TELEGRAM_CHAT_ID = update.telegram_chat_id
        env_updates["TELEGRAM_CHAT_ID"] = update.telegram_chat_id
    if update.telegram_auto_alerts is not None:
        settings.TELEGRAM_AUTO_ALERTS = update.telegram_auto_alerts
        env_updates["TELEGRAM_AUTO_ALERTS"] = str(update.telegram_auto_alerts)
    if update.telegram_min_score is not None:
        settings.TELEGRAM_MIN_SCORE = update.telegram_min_score
        env_updates["TELEGRAM_MIN_SCORE"] = str(update.telegram_min_score)
    if update.default_risk_percent is not None:
        settings.DEFAULT_RISK_PER_TRADE_PERCENT = update.default_risk_percent
        env_updates["DEFAULT_RISK_PER_TRADE_PERCENT"] = str(update.default_risk_percent)
    if update.default_account_balance is not None:
        settings.DEFAULT_ACCOUNT_BALANCE = update.default_account_balance
        env_updates["DEFAULT_ACCOUNT_BALANCE"] = str(update.default_account_balance)

    if env_updates:
        _persist_to_env(env_updates)

    return {"message": "Configuraciones actualizadas exitosamente", "ai_provider": settings.AI_PROVIDER}


@router.post("/settings/test-telegram")
async def test_telegram(req: TelegramTestRequest):
    token = req.bot_token or settings.TELEGRAM_BOT_TOKEN
    chat_id = req.chat_id or settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        raise HTTPException(
            status_code=400,
            detail="Falta el Bot Token o el Chat ID. Por favor ingrésalos antes de enviar la prueba."
        )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": (
            "🔔 <b>TradePilot AI • Verificación de Alertas</b>\n\n"
            "✅ ¡Tu Telegram personal ha sido conectado con éxito!\n\n"
            "A partir de ahora recibirás en este chat las señales de alta confluencia (COMPRA/VENTA) "
            "con sus precios de entrada, Stop Loss y Take Profit."
        ),
        "parse_mode": "HTML"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
            if not resp.is_success or not data.get("ok"):
                description = data.get("description", "Error desconocido de Telegram")
                raise HTTPException(
                    status_code=400,
                    detail=f"Error de Telegram: {description}. Asegúrate de haberle dado '/start' a tu bot primero en Telegram."
                )
            return {"success": True, "message": "¡Mensaje de prueba enviado con éxito a tu Telegram!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo conectar con los servidores de Telegram: {str(e)}")
