import pytest
import pandas as pd
import numpy as np
from app.schemas.market_data import Candle
from app.indicators.calculator import TechnicalCalculator


def generate_sample_candles(n: int = 100, trend: str = "bullish"):
    candles = []
    base_price = 100.0
    for i in range(n):
        if trend == "bullish":
            price = base_price + (i * 0.5) + np.sin(i / 5.0)
        elif trend == "bearish":
            price = base_price - (i * 0.5) + np.sin(i / 5.0)
        else:
            price = base_price + np.sin(i / 3.0) * 2.0

        candles.append(Candle(
            timestamp=1600000000000 + (i * 3600000),
            open=price - 0.2,
            high=price + 0.8,
            low=price - 0.8,
            close=price + 0.1,
            volume=1000.0 + (i * 10),
            is_closed=True
        ))
    return candles


def test_empty_candles():
    res = TechnicalCalculator.analyze([], symbol="TEST")
    assert res.current_price == 0.0
    assert res.structure.trend == "SIDEWAYS"
    assert res.indicators.rsi is None


def test_insufficient_candles():
    few_candles = generate_sample_candles(5)
    res = TechnicalCalculator.analyze(few_candles, symbol="TEST")
    assert res.current_price > 0.0
    assert res.indicators.ema_200 is None


def test_indicators_bullish():
    candles = generate_sample_candles(150, trend="bullish")
    res = TechnicalCalculator.analyze(candles, symbol="BTCUSDT")

    assert res.indicators.ema_9 is not None
    assert res.indicators.ema_20 is not None
    assert res.indicators.ema_50 is not None
    assert res.indicators.rsi is not None
    assert res.indicators.rsi > 50  # Bullish series should have RSI > 50
    assert res.indicators.macd_line is not None
    assert res.indicators.macd_hist is not None
    assert res.indicators.atr is not None
    assert res.indicators.bollinger_upper is not None
    assert res.indicators.bollinger_lower is not None
    assert res.indicators.bollinger_upper > res.indicators.bollinger_lower
    assert res.structure.trend == "BULLISH"


def test_indicators_bearish():
    candles = generate_sample_candles(150, trend="bearish")
    res = TechnicalCalculator.analyze(candles, symbol="BTCUSDT")

    assert res.indicators.rsi is not None
    assert res.indicators.rsi < 50
    assert res.structure.trend == "BEARISH"


def test_stochastic_rsi():
    candles = generate_sample_candles(100)
    df = TechnicalCalculator.candles_to_dataframe(candles)
    k, d = TechnicalCalculator.calculate_stochastic_rsi(df["close"])

    assert len(k) == len(df)
    assert 0 <= k.iloc[-1] <= 100
    assert 0 <= d.iloc[-1] <= 100
