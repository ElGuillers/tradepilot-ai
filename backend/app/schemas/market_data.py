from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Candle(BaseModel):
    timestamp: int  # millisecond epoch
    open: float
    high: float
    low: float
    close: float
    volume: float
    is_closed: bool = True
    datetime_str: Optional[str] = None


class AssetInfo(BaseModel):
    symbol: str
    base_asset: str
    quote_asset: str
    market: str = "crypto"  # crypto, forex, stocks, indices
    status: str = "TRADING"
    source: str = "Binance"
    is_favorite: bool = False


class MarketOverviewItem(BaseModel):
    symbol: str
    price: float
    change_24h_percent: float
    high_24h: float
    low_24h: float
    volume_24h: float
    market: str = "crypto"
    data_source: str = "Binance Public API"
    data_status: str = "REALTIME"  # REALTIME, DELAYED, HISTORICAL, SIMULATED, UNAVAILABLE


class MarketDataResponse(BaseModel):
    symbol: str
    timeframe: str
    market: str
    data_source: str
    data_status: str
    candles: List[Candle]
