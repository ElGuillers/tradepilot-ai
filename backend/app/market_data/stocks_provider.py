import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import httpx
from app.market_data.base import BaseMarketDataProvider
from app.schemas.market_data import Candle, AssetInfo, MarketOverviewItem

logger = logging.getLogger(__name__)

CURATED_STOCKS = [
    ("AAPL", "Apple Inc.", "stocks"),
    ("NVDA", "NVIDIA Corp.", "stocks"),
    ("TSLA", "Tesla Inc.", "stocks"),
    ("MSFT", "Microsoft Corp.", "stocks"),
    ("AMZN", "Amazon.com Inc.", "stocks"),
    ("GOOGL", "Alphabet Inc.", "stocks"),
    ("META", "Meta Platforms Inc.", "stocks"),
    ("SPY", "SPDR S&P 500 ETF", "indices"),
    ("QQQ", "Invesco QQQ Trust", "indices"),
    ("EUR/USD", "Euro / US Dollar", "forex"),
    ("GBP/USD", "British Pound / US Dollar", "forex"),
    ("PAXGUSDT", "Oro Spot 1:1 ($/oz)", "commodities"),
]

def normalize_yahoo_symbol(sym: str) -> str:
    s = sym.upper().replace("/", "")
    mapping = {
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "USDJPY=X",
        "AUDUSD": "AUDUSD=X",
        "USDCAD": "USDCAD=X",
        "XAUUSD": "GC=F",
        "PAXGUSDT": "GC=F",
        "PAXG": "GC=F",
        "GOLD": "GC=F",
    }
    return mapping.get(s, sym.upper())

# Map our standard timeframes to Yahoo Finance intervals and ranges
TF_MAP: Dict[str, Tuple[str, str]] = {
    "1m": ("1m", "1d"),
    "3m": ("5m", "1d"),
    "5m": ("5m", "5d"),
    "15m": ("15m", "5d"),
    "30m": ("30m", "1mo"),
    "1h": ("60m", "1mo"),
    "4h": ("4h", "3mo"),
    "1d": ("1d", "1y"),
}


class YahooStocksProvider(BaseMarketDataProvider):
    """
    Real-time & historical market data provider for US Stocks & Indices
    via Yahoo Finance Public Chart API (Zero API Keys required).
    """
    def __init__(self):
        self._provider_name = "Yahoo Finance (Acciones & Índices)"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def supported_markets(self) -> List[str]:
        return ["stocks", "indices", "forex"]

    async def check_health(self) -> Dict[str, Any]:
        try:
            url = "https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=1d&interval=1d"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 200:
                    return {
                        "provider": self.provider_name,
                        "status": "online",
                        "latency_ms": res.elapsed.total_seconds() * 1000,
                        "supported_markets": self.supported_markets
                    }
                return {"provider": self.provider_name, "status": "degraded"}
        except Exception as e:
            return {"provider": self.provider_name, "status": "offline", "error": str(e)}

    async def get_candles(
        self,
        symbol: str,
        timeframe: str,
        limit: int = 200,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[Candle]:
        interval, default_range = TF_MAP.get(timeframe, ("60m", "1mo"))
        raw_sym = normalize_yahoo_symbol(symbol)
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{raw_sym}?range={default_range}&interval={interval}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=self.headers)
                resp.raise_for_status()
                data = resp.json()

            chart_result = data.get("chart", {}).get("result", [])
            if not chart_result:
                return []

            result = chart_result[0]
            timestamps = result.get("timestamp", [])
            quote = result.get("indicators", {}).get("quote", [{}])[0]

            opens = quote.get("open", [])
            highs = quote.get("high", [])
            lows = quote.get("low", [])
            closes = quote.get("close", [])
            volumes = quote.get("volume", [])

            candles: List[Candle] = []
            n = len(timestamps)

            for i in range(n):
                # Filter out null periods (pre/post market empty slots)
                o = opens[i] if i < len(opens) else None
                h = highs[i] if i < len(highs) else None
                l = lows[i] if i < len(lows) else None
                c = closes[i] if i < len(closes) else None
                v = volumes[i] if i < len(volumes) else 0

                if o is None or h is None or l is None or c is None:
                    continue

                ts_ms = int(timestamps[i]) * 1000
                is_closed = i < (n - 1)

                candles.append(Candle(
                    timestamp=ts_ms,
                    open=round(float(o), 4),
                    high=round(float(h), 4),
                    low=round(float(l), 4),
                    close=round(float(c), 4),
                    volume=float(v or 0),
                    is_closed=is_closed,
                    datetime_str=datetime.fromtimestamp(ts_ms / 1000, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                ))

            return candles[-limit:]
        except Exception as e:
            logger.error(f"Error fetching stock candles for {symbol}: {e}")
            return []

    async def get_overview(self) -> List[MarketOverviewItem]:
        results: List[MarketOverviewItem] = []

        async with httpx.AsyncClient(timeout=6.0, headers=self.headers) as client:
            async def fetch_stock_overview(sym: str, name: str, mkt: str) -> Optional[MarketOverviewItem]:
                try:
                    raw_sym = normalize_yahoo_symbol(sym)
                    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{raw_sym}?range=1d&interval=1d"
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()["chart"]["result"][0]
                        meta = data.get("meta", {})
                        price = float(meta.get("regularMarketPrice") or meta.get("chartPreviousClose") or 100.0)
                        prev_close = float(meta.get("chartPreviousClose") or price)
                        change_pct = ((price - prev_close) / prev_close) * 100 if prev_close > 0 else 0.0
                        dec = 4 if price < 10 else 2

                        return MarketOverviewItem(
                            symbol=sym,
                            price=round(price, dec),
                            change_24h_percent=round(change_pct, 2),
                            high_24h=round(float(meta.get("regularMarketDayHigh") or price), dec),
                            low_24h=round(float(meta.get("regularMarketDayLow") or price), dec),
                            volume_24h=float(meta.get("regularMarketVolume") or 0),
                            market=mkt,
                            data_source=self.provider_name,
                            data_status="REALTIME"
                        )
                except Exception:
                    pass
                return None

            items = await asyncio.gather(*[
                fetch_stock_overview(sym, name, mkt)
                for sym, name, mkt in CURATED_STOCKS
            ])
            results = [item for item in items if item is not None]

        return results

    async def get_assets(self) -> List[AssetInfo]:
        return [
            AssetInfo(symbol=sym, base_asset=sym, quote_asset="USD", market=mkt, status="TRADING", source=self.provider_name, is_favorite=(sym in ["AAPL", "NVDA", "SPY"]))
            for sym, _, mkt in CURATED_STOCKS
        ]
