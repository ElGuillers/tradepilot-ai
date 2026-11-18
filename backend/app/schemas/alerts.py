from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AlertCreate(BaseModel):
    symbol: str
    market: str = "crypto"
    timeframe: str = "1h"
    min_score: float = 75.0
    signal_type: str = "ANY"  # BUY, SELL, ANY
    telegram_notify: bool = False


class AlertResponse(BaseModel):
    id: int
    symbol: str
    market: str
    timeframe: str
    min_score: float
    signal_type: str
    active: bool
    telegram_notify: bool
    created_at: datetime
    last_triggered_at: Optional[datetime] = None


class AlertNotification(BaseModel):
    id: str
    timestamp: datetime
    symbol: str
    market: str = "crypto"
    timeframe: str = "1h"
    direction: str = "WAIT"
    score: float = 0.0
    color: str = "green"  # "green", "red", "yellow", "blue"
    category: str = "buy"  # "buy", "sell", "wait", "breakout"
    title: str = ""
    message: str
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit_1: Optional[float] = None
    take_profit_2: Optional[float] = None
    risk_reward: Optional[float] = None
    broker_symbol: Optional[str] = None
    read: bool = False
