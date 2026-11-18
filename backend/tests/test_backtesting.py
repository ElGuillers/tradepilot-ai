from app.schemas.backtesting import BacktestRequest
from app.backtesting.engine import backtest_engine
from tests.test_indicators import generate_sample_candles


def test_backtest_execution():
    candles = generate_sample_candles(200, trend="bullish")
    req = BacktestRequest(
        symbol="BTCUSDT",
        initial_capital=10000.0,
        risk_per_trade_percent=1.5,
        commission_percent=0.075,
        slippage_percent=0.05
    )
    result = backtest_engine.run(candles, req)

    assert result.initial_capital == 10000.0
    assert result.final_capital > 0
    assert len(result.equity_curve) > 0
    assert result.symbol == "BTCUSDT"
