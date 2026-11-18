import asyncio
import logging
from app.market_data.manager import market_data_manager
from app.signal_engine.engine import signal_engine
from app.alerts.manager import alert_manager

logger = logging.getLogger("tradepilot.scanner")

SCAN_SYMBOLS = [
    ("PAXGUSDT", "commodities"), # Oro Spot 1:1 (XAUUSD / CME GC=F)
    ("BTCUSDT", "crypto"),     # Bitcoin (BTCUSD)
    ("ETHUSDT", "crypto"),     # Ethereum (ETHUSD)
    ("SOLUSDT", "crypto"),     # Solana (SOLUSD)
    ("NVDA", "stocks"),        # NVIDIA Corp
    ("TSLA", "stocks"),        # Tesla Inc
    ("SPY", "indices"),        # S&P 500 (US500)
    ("AAPL", "stocks"),        # Apple Inc
]

SCAN_TIMEFRAMES = ["15m", "1h"]


async def run_market_scanner():
    """
    Autonomous background market scanner: Continuously evaluates curated assets
    across high-probability timeframes and automatically dispatches alerts to Telegram.
    """
    logger.info("Starting autonomous market scanner for high-probability signals...")
    await asyncio.sleep(1)  # Initial quick start

    while True:
        try:
            for symbol, market in SCAN_SYMBOLS:
                for tf in SCAN_TIMEFRAMES:
                    try:
                        candles_res = await market_data_manager.get_candles(symbol, tf, market, limit=120)
                        if candles_res.candles and len(candles_res.candles) >= 30:
                            signal = signal_engine.generate_signal(
                                symbol=symbol,
                                timeframe=tf,
                                candles=candles_res.candles,
                                market=market,
                                trading_style="day_trading"
                            )
                            await alert_manager.evaluate_signal_for_alerts(signal)
                    except Exception as e:
                        logger.debug(f"Scanner tick on {symbol} {tf}: {e}")
                    await asyncio.sleep(0.5)

            # Wait 60 seconds between scan cycles
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            logger.info("Autonomous market scanner cancelled.")
            break
        except Exception as e:
            logger.error(f"Market scanner loop encountered error: {e}")
            await asyncio.sleep(30)
