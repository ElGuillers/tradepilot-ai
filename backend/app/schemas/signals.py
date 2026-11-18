from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FactorScore(BaseModel):
    name: str
    weight: float
    score: float
    contribution: float
    reason: str


class SignalResponse(BaseModel):
    id: Optional[int] = None
    symbol: str
    market: str = "crypto"
    direction: str  # BUY, SELL, WAIT, NO_TRADE
    timeframe: str
    trading_style: str = "day_trading"  # scalping, day_trading, swing_trading
    reference_price: float
    entry_price: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    risk_reward: float
    score: float  # 0 to 100
    score_classification: str  # Desfavorable, Sin oportunidad, Vigilar, Posible oportunidad, Confluencia elevada
    status: str = "CONFIRMED"  # DETECTED, PENDING, CONFIRMED, INVALIDATED, EXPIRED
    data_source: str = "Binance Public API"
    data_status: str = "REALTIME"
    justification: str
    factors: List[FactorScore] = []
    indicators: Dict[str, Any] = {}
    ai_analysis: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class SignalListResponse(BaseModel):
    signals: List[SignalResponse]
    total: int
