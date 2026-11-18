from typing import List, Optional, Dict
from pydantic import BaseModel


class IndicatorValues(BaseModel):
    # Trend
    ema_9: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None

    # Momentum
    rsi: Optional[float] = None
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None

    # Volatility
    atr: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_middle: Optional[float] = None
    bollinger_lower: Optional[float] = None
    bollinger_width: Optional[float] = None

    # Volume
    volume: Optional[float] = None
    volume_sma: Optional[float] = None
    relative_volume: Optional[float] = None
    volume_anomaly: Optional[bool] = False


class MarketStructure(BaseModel):
    trend: str  # BULLISH, BEARISH, SIDEWAYS
    supports: List[float]
    resistances: List[float]
    swing_high: Optional[float] = None
    swing_low: Optional[float] = None
    breakout: Optional[str] = None  # BULLISH_BREAKOUT, BEARISH_BREAKDOWN, NONE
    structure_shift: Optional[str] = None  # BULLISH_CHANGE, BEARISH_CHANGE, NONE


class TechnicalAnalysisResult(BaseModel):
    symbol: str
    timeframe: str
    current_price: float
    indicators: IndicatorValues
    structure: MarketStructure
    indicator_series: Optional[Dict[str, List[Optional[float]]]] = None
