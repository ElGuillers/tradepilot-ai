import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import httpx
from app.market_data.base import BaseMarketDataProvider
from app.schemas.market_data import Candle, AssetInfo, MarketOverviewItem

logger = logging.getLogger(__name__)

# Standard pairs for fast monitoring (including Gold PAXGUSDT)
CURATED_PAIRS = [
    ("BTCUSDT", "BTC", "USDT"),
    ("ETHUSDT", "ETH", "USDT"),
    ("SOLUSDT", "SOL", "USDT"),
    ("PAXGUSDT", "PAXG", "USDT"),  # Oro físico respaldado 1:1 (Pax Gold)
    ("BNBUSDT", "BNB", "USDT"),
    ("XRPUSDT", "XRP", "USDT"),
    ("ADAUSDT", "ADA", "USDT"),
    ("DOGEUSDT", "DOGE", "USDT"),
    ("AVAXUSDT", "AVAX", "USDT"),
    ("LINKUSDT", "LINK", "USDT"),
    ("NEARUSDT", "NEAR", "USDT"),
    ("DOTUSDT", "DOT", "USDT")
]


class BinanceMarketDataProvider(BaseMarketDataProvider):
    def __init__(self, base_url: str = "https://api.binance.com"):
        self.base_url = base_url.rstrip("/")
        self._provider_name = "Binance Public API"

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def supported_markets(self) -> List[str]:
        return ["crypto"]

    async def check_health(self) -> Dict[str, Any]:
        """Check Binance API connectivity."""
        url = f"{self.base_url}/api/v3/ping"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return {
                        "provider": self.provider_name,
                        "status": "online",
                        "latency_ms": res.elapsed.total_seconds() * 1000,
                        "supported_markets": self.supported_markets
                    }
                return {
                    "provider": self.provider_name,
                    "status": "degraded",
                    "error": f"HTTP {res.status_code}",
                    "supported_markets": self.supported_markets
                }
        except Exception as e:
            return {
                "provider": self.provider_name,
                "status": "offline",
                "error": str(e),
                "supported_markets": self.supported_markets
            }

    async def get_candles(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 200,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[Candle]:
        """
        Fetch real-time and historical klines from Binance.
        """
        url = f"{self.base_url}/api/v3/klines"
        params: Dict[str, Any] = {
            "symbol": symbol.upper(),
            "interval": timeframe,
            "limit": min(limit, 1000)
        }
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            raw_klines = resp.json()

        candles: List[Candle] = []
        total = len(raw_klines)
        for idx, k in enumerate(raw_klines):
            # Kline format: [open_time, open, high, low, close, volume, close_time, ...]
            is_closed = idx < (total - 1)  # Last candle is still open/forming
            ts = int(k[0])
            candles.append(Candle(
                timestamp=ts,
                open=float(k[1]),
                high=float(k[2]),
                low=float(k[3]),
                close=float(k[4]),
                volume=float(k[5]),
                is_closed=is_closed,
                datetime_str=datetime.fromtimestamp(ts / 1000, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            ))
        return candles

    async def get_overview(self) -> List[MarketOverviewItem]:
        """
        Fetch 24hr ticker data for curated crypto assets.
        """
        url = f"{self.base_url}/api/v3/ticker/24hr"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        # Build symbol map
        ticker_map = {item["symbol"]: item for item in data}
        result: List[MarketOverviewItem] = []

        for symbol, _, _ in CURATED_PAIRS:
            if symbol in ticker_map:
                t = ticker_map[symbol]
                mkt = "commodities" if symbol == "PAXGUSDT" else "crypto"
                result.append(MarketOverviewItem(
                    symbol=symbol,
                    price=float(t["lastPrice"]),
                    change_24h_percent=float(t["priceChangePercent"]),
                    high_24h=float(t["highPrice"]),
                    low_24h=float(t["lowPrice"]),
                    volume_24h=float(t["quoteVolume"]),
                    market=mkt,
                    data_source=f"{self.provider_name} (Oro Físico 1:1)" if symbol == "PAXGUSDT" else self.provider_name,
                    data_status="REALTIME"
                ))
        return result

    async def get_assets(self) -> List[AssetInfo]:
        """
        List available assets with metadata.
        """
        assets: List[AssetInfo] = []
        for symbol, base, quote in CURATED_PAIRS:
            mkt = "commodities" if symbol == "PAXGUSDT" else "crypto"
            assets.append(AssetInfo(
                symbol=symbol,
                base_asset=base,
                quote_asset=quote,
                market=mkt,
                status="TRADING",
                source=self.provider_name,
                is_favorite=(symbol in ["BTCUSDT", "ETHUSDT", "PAXGUSDT"])
            ))
        return assets
