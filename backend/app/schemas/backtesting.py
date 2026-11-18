from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    symbol: str = "BTCUSDT"
    market: str = "crypto"
    timeframe: str = "1h"
    strategy: str = "confluence_breakout"  # confluence_breakout, ema_crossover, rsi_momentum
    initial_capital: float = Field(default=10000.0, gt=0)
    risk_per_trade_percent: float = Field(default=1.5, gt=0, le=10)
    commission_percent: float = Field(default=0.075, ge=0)  # 0.075% Binance spot default
    slippage_percent: float = Field(default=0.05, ge=0)
    limit_candles: int = Field(default=500, ge=50, le=1000)


class BacktestTrade(BaseModel):
    id: int
    direction: str  # BUY or SELL
    entry_time: str
    entry_price: float
    exit_time: str
    exit_price: float
    exit_reason: str  # TAKE_PROFIT_1, TAKE_PROFIT_2, STOP_LOSS, TIMEOUT
    position_size: float
    pnl_amount: float
    pnl_percent: float
    capital_after: float
    score_at_entry: float


class EquityPoint(BaseModel):
    time: str
    capital: float
    drawdown_percent: float


class BacktestResponse(BaseModel):
    symbol: str
    market: str
    timeframe: str
    strategy: str
    initial_capital: float
    final_capital: float
    net_profit: float
    net_profit_percent: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_percent: float
    profit_factor: float
    max_drawdown_percent: float
    expectancy_per_trade: float
    avg_risk_reward: float
    trades: List[BacktestTrade]
    equity_curve: List[EquityPoint]
    disclaimer: str = (
        "El rendimiento pasado y las simulaciones de backtesting no garantizan resultados futuros. "
        "Los cálculos incluyen comisiones y slippage estimados."
    )
