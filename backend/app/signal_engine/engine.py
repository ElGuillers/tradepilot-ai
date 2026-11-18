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

        # Calculate hypothetical trade execution levels
        atr = indicators.atr or (current_price * 0.01)
        entry_price = current_price

        if direction == "BUY":
            # SL below recent swing low or 1.5 * ATR
            sl_candidate = (structure.swing_low * 0.998) if structure.swing_low and structure.swing_low < entry_price else (entry_price - (1.5 * atr))
            # Ensure SL is within reasonable bound (max 5% for crypto intraday)
            stop_loss = max(sl_candidate, entry_price * 0.95)
            risk = entry_price - stop_loss
            if risk <= 0:
                risk = entry_price * 0.015
                stop_loss = entry_price - risk

            take_profit_1 = round(entry_price + (risk * 1.5), 4)
            take_profit_2 = round(entry_price + (risk * 2.5), 4)
            stop_loss = round(stop_loss, 4)
            risk_reward = 1.5
        elif direction == "SELL":
            # SL above recent swing high or 1.5 * ATR
            sl_candidate = (structure.swing_high * 1.002) if structure.swing_high and structure.swing_high > entry_price else (entry_price + (1.5 * atr))
            stop_loss = min(sl_candidate, entry_price * 1.05)
            risk = stop_loss - entry_price
            if risk <= 0:
                risk = entry_price * 0.015
                stop_loss = entry_price + risk

            take_profit_1 = round(entry_price - (risk * 1.5), 4)
            take_profit_2 = round(entry_price - (risk * 2.5), 4)
            stop_loss = round(stop_loss, 4)
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
