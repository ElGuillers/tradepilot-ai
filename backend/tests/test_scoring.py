from app.schemas.indicators import IndicatorValues, MarketStructure
from app.signal_engine.scorer import OpportunityScorer
from app.signal_engine.engine import signal_engine
from tests.test_indicators import generate_sample_candles


def test_scorer_bullish_confluence():
    scorer = OpportunityScorer()
    indicators = IndicatorValues(
        ema_20=100.0,
        ema_50=95.0,
        rsi=60.0,
        macd_hist=1.5,
        relative_volume=1.8,
        atr=2.0
    )
    structure = MarketStructure(
        trend="BULLISH",
        supports=[98.0, 95.0],
        resistances=[110.0],
        breakout="BULLISH_BREAKOUT"
    )

    score, direction, factors, justification = scorer.evaluate(
        price=105.0,
        indicators=indicators,
        structure=structure,
        higher_tf_trend="BULLISH"
    )

    assert score >= 75.0
    assert direction == "BUY"
    assert "Posible oportunidad" in scorer.classify_score(score) or "Confluencia elevada" in scorer.classify_score(score)
    assert len(factors) == 6


def test_scorer_bearish_confluence():
    scorer = OpportunityScorer()
    indicators = IndicatorValues(
        ema_20=95.0,
        ema_50=100.0,
        rsi=38.0,
        macd_hist=-1.5,
        relative_volume=1.6,
        atr=2.0
    )
    structure = MarketStructure(
        trend="BEARISH",
        supports=[80.0],
        resistances=[96.0, 100.0],
        breakout="BEARISH_BREAKDOWN"
    )

    score, direction, factors, justification = scorer.evaluate(
        price=90.0,
        indicators=indicators,
        structure=structure,
        higher_tf_trend="BEARISH"
    )

    assert score >= 75.0
    assert direction == "SELL"


def test_signal_engine_levels():
    candles = generate_sample_candles(100, trend="bullish")
    signal = signal_engine.generate_signal(
        symbol="ETHUSDT",
        timeframe="1h",
        candles=candles
    )

    assert signal.symbol == "ETHUSDT"
    assert signal.reference_price > 0
    if signal.direction == "BUY":
        assert signal.stop_loss < signal.entry_price
        assert signal.take_profit_1 > signal.entry_price
        assert signal.take_profit_2 > signal.take_profit_1
    elif signal.direction == "SELL":
        assert signal.stop_loss > signal.entry_price
        assert signal.take_profit_1 < signal.entry_price
