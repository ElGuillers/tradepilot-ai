from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.schemas.market_data import Candle, AssetInfo, MarketOverviewItem


class BaseMarketDataProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def supported_markets(self) -> List[str]:
        pass

    @abstractmethod
    async def get_candles(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 100,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[Candle]:
        """Fetch OHLCV candles."""
        pass

    @abstractmethod
    async def get_overview(self) -> List[MarketOverviewItem]:
        """Fetch market overview/tickers."""
        pass

    @abstractmethod
    async def get_assets(self) -> List[AssetInfo]:
        """Fetch list of tradable symbols."""
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Check provider connection health."""
        pass
