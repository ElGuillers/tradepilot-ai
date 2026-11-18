import time
import asyncio
from typing import List, Dict, Any, Optional
from app.market_data.base import BaseMarketDataProvider
from app.market_data.binance import BinanceMarketDataProvider
from app.market_data.forex_stocks import MultiAssetProvider
from app.market_data.stocks_provider import YahooStocksProvider, CURATED_STOCKS
from app.schemas.market_data import Candle, AssetInfo, MarketOverviewItem, MarketDataResponse


class MarketDataManager:
    def __init__(self):
        self.binance_provider = BinanceMarketDataProvider()
        self.stocks_provider = YahooStocksProvider()
        self.multi_asset_provider = MultiAssetProvider()
        self._candle_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl_seconds = 10  # 10s cache to respect API rate limits
        self._overview_cache: Dict[str, Dict[str, Any]] = {}
        self._overview_ttl = 20  # 20s cache for ultra-fast instant UI rendering

    def _get_provider_for_market(self, market: str, symbol: str = "") -> BaseMarketDataProvider:
        sym = symbol.upper()
        if sym in ["PAXGUSDT", "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "NEARUSDT", "DOTUSDT"]:
            return self.binance_provider
        return self.stocks_provider

    async def get_candles(
        self,
        symbol: str,
        timeframe: str = "1h",
        market: str = "crypto",
        limit: int = 200
    ) -> MarketDataResponse:
        cache_key = f"{market}:{symbol.upper()}:{timeframe}:{limit}"
        now = time.time()

        if cache_key in self._candle_cache:
            entry = self._candle_cache[cache_key]
            if now - entry["timestamp"] < self._cache_ttl_seconds:
                return entry["data"]

        provider = self._get_provider_for_market(market, symbol)
        candles = await provider.get_candles(symbol, timeframe, limit=limit)
        
        status = "REALTIME" if (candles and len(candles) > 0) else "UNAVAILABLE"
        if not candles and market.lower() == "forex":
            pass

        response = MarketDataResponse(
            symbol=symbol.upper(),
            timeframe=timeframe,
            market=market,
            data_source=provider.provider_name,
            data_status=status,
            candles=candles
        )

        self._candle_cache[cache_key] = {
            "timestamp": now,
            "data": response
        }
        return response

    async def get_overview(self, market: Optional[str] = None) -> List[MarketOverviewItem]:
        cache_key = market.lower() if market else "all"
        now = time.time()
        if cache_key in self._overview_cache:
            entry = self._overview_cache[cache_key]
            if now - entry["timestamp"] < self._overview_ttl:
                return entry["data"]

        results: List[MarketOverviewItem] = []

        # Execute providers concurrently
        async def fetch_binance():
            if not market or market.lower() in ["crypto", "commodities"]:
                try:
                    items = await self.binance_provider.get_overview()
                    return [i for i in items if i.market.lower() == market.lower()] if market else items
                except Exception:
                    return []
            return []

        async def fetch_stocks():
            if not market or market.lower() in ["stocks", "indices", "forex"]:
                try:
                    items = await self.stocks_provider.get_overview()
                    return [i for i in items if i.market.lower() == market.lower()] if market else items
                except Exception:
                    return []
            return []

        async def fetch_multi():
            return []

        b_res, s_res, m_res = await asyncio.gather(fetch_binance(), fetch_stocks(), fetch_multi())
        results.extend(b_res)
        results.extend(s_res)
        results.extend(m_res)

        self._overview_cache[cache_key] = {
            "timestamp": now,
            "data": results
        }
        return results

    async def get_assets(self, market: Optional[str] = None) -> List[AssetInfo]:
        assets: List[AssetInfo] = []
        if not market or market.lower() in ["crypto", "commodities"]:
            b_assets = await self.binance_provider.get_assets()
            if market:
                b_assets = [a for a in b_assets if a.market.lower() == market.lower()]
            assets.extend(b_assets)
        if not market or market.lower() in ["stocks", "indices"]:
            s_assets = await self.stocks_provider.get_assets()
            if market:
                s_assets = [a for a in s_assets if a.market.lower() == market.lower()]
            assets.extend(s_assets)
        if not market or market.lower() in ["forex", "commodities"]:
            multi_assets = await self.multi_asset_provider.get_assets()
            if market:
                multi_assets = [a for a in multi_assets if a.market.lower() == market.lower()]
            assets.extend(multi_assets)
        return assets

    async def check_all_providers(self) -> List[Dict[str, Any]]:
        binance_status = await self.binance_provider.check_health()
        stocks_status = await self.stocks_provider.check_health()
        multi_status = await self.multi_asset_provider.check_health()
        return [binance_status, stocks_status, multi_status]


market_data_manager = MarketDataManager()
