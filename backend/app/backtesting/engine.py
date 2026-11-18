from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from app.schemas.market_data import Candle
from app.schemas.backtesting import BacktestRequest, BacktestResponse, BacktestTrade, EquityPoint
from app.indicators.calculator import TechnicalCalculator
from app.signal_engine.scorer import OpportunityScorer


class BacktestEngine:
    def __init__(self):
        self.scorer = OpportunityScorer()

    def run(self, candles: List[Candle], req: BacktestRequest) -> BacktestResponse:
        """
        Executes an event-driven backtest forward through historical candles
        without look-ahead bias.
        """
        if not candles or len(candles) < 60:
            return BacktestResponse(
                symbol=req.symbol,
                market=req.market,
                timeframe=req.timeframe,
                strategy=req.strategy,
                initial_capital=req.initial_capital,
                final_capital=req.initial_capital,
                net_profit=0.0,
                net_profit_percent=0.0,
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate_percent=0.0,
                profit_factor=0.0,
                max_drawdown_percent=0.0,
                expectancy_per_trade=0.0,
                avg_risk_reward=0.0,
                trades=[],
                equity_curve=[]
            )

        df = TechnicalCalculator.candles_to_dataframe(candles)
        capital = req.initial_capital
        peak_capital = capital
        max_drawdown_pct = 0.0

        trades: List[BacktestTrade] = []
        equity_curve: List[EquityPoint] = []

        in_position = False
        position_dir = ""
        entry_price = 0.0
        entry_idx = 0
        entry_time = ""
        stop_loss = 0.0
        take_profit = 0.0
        position_units = 0.0
        score_at_entry = 0.0

        # Precompute indicators up to index i to ensure strictly backward-looking data
        # Step through bars starting from bar 50
        min_bars = 40
        total_bars = len(df)

        for i in range(min_bars, total_bars):
            current_bar = df.iloc[i]
            prev_bar = df.iloc[i - 1]
            bar_time = candles[i].datetime_str or str(candles[i].timestamp)
            high_price = float(current_bar["high"])
            low_price = float(current_bar["low"])
            close_price = float(current_bar["close"])

            # 1. Check exit if currently in position
            if in_position:
                exit_price = 0.0
                exit_reason = ""

                if position_dir == "BUY":
                    if low_price <= stop_loss:
                        exit_price = stop_loss * (1 - (req.slippage_percent / 100.0))
                        exit_reason = "STOP_LOSS"
                    elif high_price >= take_profit:
                        exit_price = take_profit * (1 - (req.slippage_percent / 100.0))
                        exit_reason = "TAKE_PROFIT"
                    elif (i - entry_idx) >= 30:  # Timeout exit
                        exit_price = close_price * (1 - (req.slippage_percent / 100.0))
                        exit_reason = "TIMEOUT"
                elif position_dir == "SELL":
                    if high_price >= stop_loss:
                        exit_price = stop_loss * (1 + (req.slippage_percent / 100.0))
                        exit_reason = "STOP_LOSS"
                    elif low_price <= take_profit:
                        exit_price = take_profit * (1 + (req.slippage_percent / 100.0))
                        exit_reason = "TAKE_PROFIT"
                    elif (i - entry_idx) >= 30:
                        exit_price = close_price * (1 + (req.slippage_percent / 100.0))
                        exit_reason = "TIMEOUT"

                if exit_reason:
                    # Calculate PnL minus commissions
                    gross_pnl = (exit_price - entry_price) * position_units if position_dir == "BUY" else (entry_price - exit_price) * position_units
                    entry_comm = (entry_price * position_units) * (req.commission_percent / 100.0)
                    exit_comm = (exit_price * position_units) * (req.commission_percent / 100.0)
                    net_pnl = gross_pnl - entry_comm - exit_comm

                    capital += net_pnl
                    pnl_pct = (net_pnl / (entry_price * position_units)) * 100.0 if (entry_price * position_units) > 0 else 0.0

                    trades.append(BacktestTrade(
                        id=len(trades) + 1,
                        direction=position_dir,
                        entry_time=entry_time,
                        entry_price=round(entry_price, 4),
                        exit_time=bar_time,
                        exit_price=round(exit_price, 4),
                        exit_reason=exit_reason,
                        position_size=round(position_units, 4),
                        pnl_amount=round(net_pnl, 2),
                        pnl_percent=round(pnl_pct, 2),
                        capital_after=round(capital, 2),
                        score_at_entry=round(score_at_entry, 1)
                    ))
                    in_position = False

            # Update peak and drawdown
            if capital > peak_capital:
                peak_capital = capital
            drawdown_pct = ((peak_capital - capital) / peak_capital) * 100.0 if peak_capital > 0 else 0.0
            if drawdown_pct > max_drawdown_pct:
                max_drawdown_pct = drawdown_pct

            # Record equity point every 5 bars or on trade
            if i % 5 == 0 or i == total_bars - 1:
                equity_curve.append(EquityPoint(
                    time=bar_time,
                    capital=round(capital, 2),
                    drawdown_percent=round(drawdown_pct, 2)
                ))

            # 2. Check entry signal if not in position (using closed bars up to i-1)
            if not in_position and i < total_bars - 1:
                historical_slice = candles[:i]
                analysis = TechnicalCalculator.analyze(historical_slice, symbol=req.symbol, timeframe=req.timeframe)
                score, direction, _, _ = self.scorer.evaluate(
                    price=float(prev_bar["close"]),
                    indicators=analysis.indicators,
                    structure=analysis.structure
                )

                if score >= 70 and direction in ["BUY", "SELL"]:
                    atr = analysis.indicators.atr or (float(prev_bar["close"]) * 0.015)
                    slip_mult = (1 + (req.slippage_percent / 100.0)) if direction == "BUY" else (1 - (req.slippage_percent / 100.0))
                    entry_price = float(current_bar["open"]) * slip_mult
                    entry_idx = i
                    entry_time = bar_time
                    score_at_entry = score
                    position_dir = direction

                    monetary_risk = capital * (req.risk_per_trade_percent / 100.0)

                    if direction == "BUY":
                        stop_loss = entry_price - (1.5 * atr)
                        take_profit = entry_price + (2.5 * atr)
                        dist = max(entry_price - stop_loss, entry_price * 0.005)
                    else:
                        stop_loss = entry_price + (1.5 * atr)
                        take_profit = entry_price - (2.5 * atr)
                        dist = max(stop_loss - entry_price, entry_price * 0.005)

                    position_units = monetary_risk / dist
                    in_position = True

        # Calculate performance statistics
        total_trades = len(trades)
        winning_trades = [t for t in trades if t.pnl_amount > 0]
        losing_trades = [t for t in trades if t.pnl_amount <= 0]
        win_count = len(winning_trades)
        loss_count = len(losing_trades)

        win_rate = (win_count / total_trades * 100.0) if total_trades > 0 else 0.0
        gross_profit = sum(t.pnl_amount for t in winning_trades)
        gross_loss = abs(sum(t.pnl_amount for t in losing_trades))

        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 1.0)
        net_profit = capital - req.initial_capital
        net_profit_pct = (net_profit / req.initial_capital) * 100.0
        expectancy = (net_profit / total_trades) if total_trades > 0 else 0.0

        return BacktestResponse(
            symbol=req.symbol,
            market=req.market,
            timeframe=req.timeframe,
            strategy=req.strategy,
            initial_capital=round(req.initial_capital, 2),
            final_capital=round(capital, 2),
            net_profit=round(net_profit, 2),
            net_profit_percent=round(net_profit_pct, 2),
            total_trades=total_trades,
            winning_trades=win_count,
            losing_trades=loss_count,
            win_rate_percent=round(win_rate, 2),
            profit_factor=round(profit_factor, 2),
            max_drawdown_percent=round(max_drawdown_pct, 2),
            expectancy_per_trade=round(expectancy, 2),
            avg_risk_reward=1.67,
            trades=trades,
            equity_curve=equity_curve
        )


backtest_engine = BacktestEngine()
