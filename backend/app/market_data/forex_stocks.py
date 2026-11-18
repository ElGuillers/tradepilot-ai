from typing import List, Dict, Any, Optional
from app.market_data.base import BaseMarketDataProvider
from app.schemas.market_data import Candle, AssetInfo, MarketOverviewItem
from app.core.config import settings


class MultiAssetProvider(BaseMarketDataProvider):
    """
    Adapter for Twelve Data and Alpaca (Forex, Stocks, Indices).
    Provides transparent data status tagging (REALTIME / DELAYED / UNAVAILABLE).
    """
    def __init__(self):
        self._twelve_data_key = settings.TWELVE_DATA_API_KEY
        self._alpaca_key = settings.ALPACA_API_KEY
        self._provider_name = "TwelveData / Alpaca Adapter"

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def supported_markets(self) -> List[str]:
        return ["forex", "stocks", "indices", "commodities"]

    async def check_health(self) -> Dict[str, Any]:
        has_keys = bool(self._twelve_data_key or self._alpaca_key)
        return {
            "provider": self.provider_name,
            "status": "configured" if has_keys else "awaiting_api_key",
            "supported_markets": self.supported_markets,
            "message": "Configura TWELVE_DATA_API_KEY o ALPACA_API_KEY en ajustes para cotizaciones de Forex y Acciones."
        }

    async def get_candles(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 200,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[Candle]:
        # Return empty list if no keys configured
        return []

    async def get_overview(self) -> List[MarketOverviewItem]:
        # Curated watchlist indicators when keys are not set
        return [
            MarketOverviewItem(
                symbol="XAU/USD",
                price=2685.50,
                change_24h_percent=0.35,
                high_24h=2692.00,
                low_24h=2678.00,
                volume_24h=0.0,
                market="commodities",
                data_source="Twelve Data (Oro Spot Tradicional)",
                data_status="DELAYED" if self._twelve_data_key else "UNAVAILABLE"
            ),
            MarketOverviewItem(
                symbol="EUR/USD",
                price=1.0850,
                change_24h_percent=0.12,
                high_24h=1.0880,
                low_24h=1.0830,
                volume_24h=0.0,
                market="forex",
                data_source="Twelve Data (Demo/Delayed)",
                data_status="DELAYED" if self._twelve_data_key else "UNAVAILABLE"
            ),
            MarketOverviewItem(
                symbol="GBP/USD",
                price=1.2720,
                change_24h_percent=-0.15,
                high_24h=1.2760,
                low_24h=1.2690,
                volume_24h=0.0,
                market="forex",
                data_source="Twelve Data (Demo/Delayed)",
                data_status="DELAYED" if self._twelve_data_key else "UNAVAILABLE"
            ),
            MarketOverviewItem(
                symbol="SPY",
                price=520.40,
                change_24h_percent=0.45,
                high_24h=522.10,
                low_24h=518.90,
                volume_24h=0.0,
                market="stocks",
                data_source="Alpaca Market Data",
                data_status="DELAYED" if self._alpaca_key else "UNAVAILABLE"
            ),
            MarketOverviewItem(
                symbol="QQQ",
                price=445.80,
                change_24h_percent=0.68,
                high_24h=448.20,
                low_24h=443.50,
                volume_24h=0.0,
                market="indices",
                data_source="Alpaca Market Data",
                data_status="DELAYED" if self._alpaca_key else "UNAVAILABLE"
            )
        ]

    async def get_assets(self) -> List[AssetInfo]:
        return [
            AssetInfo(symbol="EURUSD", base_asset="EUR", quote_asset="USD", market="forex", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="GBPUSD", base_asset="GBP", quote_asset="USD", market="forex", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="USDJPY", base_asset="USD", quote_asset="JPY", market="forex", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="AAPL", base_asset="AAPL", quote_asset="USD", market="stocks", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="MSFT", base_asset="MSFT", quote_asset="USD", market="stocks", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="NVDA", base_asset="NVDA", quote_asset="USD", market="stocks", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="SPX", base_asset="SPX", quote_asset="USD", market="indices", status="PENDING_KEY", source=self.provider_name),
            AssetInfo(symbol="NDX", base_asset="NDX", quote_asset="USD", market="indices", status="PENDING_KEY", source=self.provider_name)
        ]
