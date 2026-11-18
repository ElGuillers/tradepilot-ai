import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.schemas.market_data import Candle
from app.schemas.signals import SignalResponse, FactorScore
from app.indicators.calculator import TechnicalCalculator
from app.signal_engine.scorer import OpportunityScorer

logger = logging.getLogger(__name__)


class SignalEngine:
    def __init__(self):
        self.scorer = OpportunityScorer()

    def generate_signal(
        self,
        symbol: str,
        timeframe: str,
        candles: List[Candle],
        market: str = "crypto",
        trading_style: str = "day_trading",
        higher_tf_candles: Optional[List[Candle]] = None
    ) -> SignalResponse:
        """
        Analyzes candle data, calculates indicators, scores factors,
        and generates a rigorous trade signal with hypothetical SL/TP levels.
        """
        if not candles or len(candles) < 20:
            return SignalResponse(
                symbol=symbol,
                market=market,
                direction="NO_TRADE",
                timeframe=timeframe,
                trading_style=trading_style,
                reference_price=0.0,
                entry_price=0.0,
                stop_loss=0.0,
                take_profit_1=0.0,
                take_profit_2=0.0,
                risk_reward=0.0,
                score=0.0,
                score_classification="Condiciones desfavorables",
                status="INVALIDATED",
                justification="Datos históricos insuficientes para calcular confluencias técnicas (mínimo 20 velas requeridas)."
            )

        # Technical analysis on primary timeframe
        tech_result = TechnicalCalculator.analyze(candles, symbol=symbol, timeframe=timeframe)
        current_price = tech_result.current_price
        indicators = tech_result.indicators
        structure = tech_result.structure

        # Higher timeframe analysis if provided
        higher_trend = "SIDEWAYS"
        if higher_tf_candles and len(higher_tf_candles) >= 20:
            htf_res = TechnicalCalculator.analyze(higher_tf_candles, symbol=symbol)
            higher_trend = htf_res.structure.trend

        # Opportunity scoring
        score, direction, factors, justification = self.scorer.evaluate(
            price=current_price,
            indicators=indicators,
            structure=structure,
            higher_tf_trend=higher_trend
        )

        score_classification = self.scorer.classify_score(score)

        # Calculate dynamic adaptive trade execution levels (Institutional Volatility Model)
        atr = indicators.atr or (current_price * 0.01)
        entry_price = current_price

        # Timeframe and market adaptive multipliers
        if timeframe in ["1m", "3m", "5m"]:
            atr_mult = 1.4
            max_risk_pct = 0.008  # 0.8% max risk
            min_risk_pct = 0.003  # 0.3% min risk
        elif timeframe in ["15m", "30m"]:
            atr_mult = 1.6
            max_risk_pct = 0.012  # 1.2% max risk
            min_risk_pct = 0.005  # 0.5% min risk
        elif timeframe == "1h":
            atr_mult = 1.8
            max_risk_pct = 0.018  # 1.8% max risk
            min_risk_pct = 0.007  # 0.7% min risk
        else:
            atr_mult = 2.0
            max_risk_pct = 0.035  # 3.5% max risk
            min_risk_pct = 0.012  # 1.2% min risk

        # Adjust max_risk_pct for lower volatility markets (stocks, gold, forex)
        if market in ["stocks", "indices"]:
            max_risk_pct *= 0.75
            min_risk_pct *= 0.75
        elif symbol in ["PAXGUSDT", "XAUUSD"]:
            max_risk_pct *= 0.6  # Gold has tight intraday ranges
            min_risk_pct *= 0.6

        # Decimal precision helper
        decimals = 2 if entry_price >= 100 else (4 if entry_price >= 1 else 6)

        default_risk = atr * atr_mult
        default_risk = max(entry_price * min_risk_pct, min(default_risk, entry_price * max_risk_pct))

        if direction == "BUY":
            # If recent swing low is close enough (local structure), use it; otherwise use dynamic ATR
            if structure.swing_low and structure.swing_low < entry_price:
                dist = entry_price - (structure.swing_low * 0.998)
                if dist <= (default_risk * 1.3):
                    risk = max(entry_price * min_risk_pct, dist)
                else:
                    risk = default_risk
            else:
                risk = default_risk

            # Hard clamp risk to max_risk_pct
            risk = min(risk, entry_price * max_risk_pct)
            stop_loss = round(entry_price - risk, decimals)
            take_profit_1 = round(entry_price + (risk * 1.5), decimals)
            take_profit_2 = round(entry_price + (risk * 2.5), decimals)
            risk_reward = 1.5

        elif direction == "SELL":
            # If recent swing high is close enough (local structure), use it; otherwise use dynamic ATR
            if structure.swing_high and structure.swing_high > entry_price:
                dist = (structure.swing_high * 1.002) - entry_price
                if dist <= (default_risk * 1.3):
                    risk = max(entry_price * min_risk_pct, dist)
                else:
                    risk = default_risk
            else:
                risk = default_risk

            # Hard clamp risk to max_risk_pct
            risk = min(risk, entry_price * max_risk_pct)
            stop_loss = round(entry_price + risk, decimals)
            take_profit_1 = round(entry_price - (risk * 1.5), decimals)
            take_profit_2 = round(entry_price - (risk * 2.5), decimals)
            risk_reward = 1.5

        else:
            stop_loss = 0.0
            take_profit_1 = 0.0
            take_profit_2 = 0.0
            risk_reward = 0.0

        # Confirmation status: if last candle closed
        last_candle_closed = candles[-1].is_closed if candles else False
        status = "CONFIRMED" if last_candle_closed else "PENDING"
        if direction in ["WAIT", "NO_TRADE"]:
            status = "DETECTED"

        # Data source based on market
        source_name = "Yahoo Finance (Acciones & Índices)" if market in ["stocks", "indices"] else "Binance Public API"

        return SignalResponse(
            symbol=symbol,
            market=market,
            direction=direction,
            timeframe=timeframe,
            trading_style=trading_style,
            reference_price=current_price,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit_1=take_profit_1,
            take_profit_2=take_profit_2,
            risk_reward=risk_reward,
            score=score,
            score_classification=score_classification,
            status=status,
            data_source=source_name,
            data_status="REALTIME",
            justification=justification,
            factors=factors,
            indicators={
                "rsi": indicators.rsi,
                "macd_line": indicators.macd_line,
                "macd_signal": indicators.macd_signal,
                "macd_hist": indicators.macd_hist,
                "ema_20": indicators.ema_20,
                "ema_50": indicators.ema_50,
                "ema_200": indicators.ema_200,
                "atr": indicators.atr,
                "relative_volume": indicators.relative_volume,
                "structure_trend": structure.trend,
                "structure_breakout": structure.breakout,
                "structure_shift": structure.structure_shift
            },
            created_at=datetime.utcnow()
        )


signal_engine = SignalEngine()
