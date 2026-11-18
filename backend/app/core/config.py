import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    APP_NAME: str = "TradePilot AI"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]

    DATABASE_URL: str = "sqlite+aiosqlite:///./tradepilot.db"

    # Market Data
    BINANCE_API_BASE: str = "https://api.binance.com"
    TWELVE_DATA_API_KEY: str = ""
    ALPACA_API_KEY: str = ""
    ALPACA_API_SECRET: str = ""

    # AI Integration
    AI_PROVIDER: str = "gemini"  # "gemini" | "claude" | "none"
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Alerts
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    TELEGRAM_AUTO_ALERTS: bool = True
    TELEGRAM_MIN_SCORE: float = 70.0

    # Risk Defaults
    DEFAULT_ACCOUNT_BALANCE: float = 10000.0
    DEFAULT_RISK_PER_TRADE_PERCENT: float = 1.5
    MIN_RISK_REWARD_RATIO: float = 1.5


settings = Settings()
