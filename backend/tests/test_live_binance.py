import pytest
import pytest_asyncio
from app.market_data.binance import BinanceMarketDataProvider


@pytest.mark.asyncio
async def test_live_binance_ping():
    provider = BinanceMarketDataProvider()
    health = await provider.check_health()
    assert health["status"] == "online"
    assert health["provider"] == "Binance Public API"


@pytest.mark.asyncio
async def test_live_binance_klines():
    provider = BinanceMarketDataProvider()
    candles = await provider.get_candles(symbol="BTCUSDT", timeframe="1h", limit=10)
    assert len(candles) == 10
    assert candles[-1].close > 0
    assert candles[-1].open > 0
    assert candles[-1].timestamp > 0


@pytest.mark.asyncio
async def test_live_binance_overview():
    provider = BinanceMarketDataProvider()
    overview = await provider.get_overview()
    assert len(overview) > 0
    btc = next((item for item in overview if item.symbol == "BTCUSDT"), None)
    assert btc is not None
    assert btc.price > 0
    assert btc.data_status == "REALTIME"
