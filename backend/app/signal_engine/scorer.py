from typing import List, Tuple, Dict, Any
from app.schemas.indicators import IndicatorValues, MarketStructure
from app.schemas.signals import FactorScore


class OpportunityScorer:
    """
    Evaluates market conditions across 6 weighted factors to produce a score from 0 to 100.
    Explains which factors increased or reduced the score.
    """
    def __init__(
        self,
        trend_weight: float = 25.0,
        momentum_weight: float = 20.0,
        volume_weight: float = 15.0,
        structure_weight: float = 20.0,
        volatility_weight: float = 10.0,
        multitimeframe_weight: float = 10.0
    ):
        self.trend_weight = trend_weight
        self.momentum_weight = momentum_weight
        self.volume_weight = volume_weight
        self.structure_weight = structure_weight
        self.volatility_weight = volatility_weight
        self.multitimeframe_weight = multitimeframe_weight

    def classify_score(self, score: float) -> str:
        if score < 40:
            return "Condiciones desfavorables"
        elif score < 60:
            return "Sin oportunidad clara"
        elif score < 75:
            return "Vigilar"
        elif score < 90:
            return "Posible oportunidad"
        else:
            return "Confluencia elevada"

    def evaluate(
        self,
        price: float,
        indicators: IndicatorValues,
        structure: MarketStructure,
        higher_tf_trend: str = "SIDEWAYS"
    ) -> Tuple[float, str, List[FactorScore], str]:
        """
        Calculates total score (0-100), direction bias (BUY/SELL/WAIT/NO_TRADE),
        detailed factor contributions, and overall justification.
        """
        factors: List[FactorScore] = []
        buy_points = 0.0
        sell_points = 0.0

        # 1. TENDENCIA (Weight 25)
        trend_score = 50.0  # neutral
        trend_reason = "Sin tendencia clara definida."
        if indicators.ema_20 and indicators.ema_50:
            if price > indicators.ema_20 > indicators.ema_50:
                trend_score = 90.0
                trend_reason = "Precio cotiza por encima de EMA 20 y EMA 50 alineadas al alza."
                buy_points += self.trend_weight * 0.9
            elif price < indicators.ema_20 < indicators.ema_50:
                trend_score = 90.0
                trend_reason = "Precio cotiza por debajo de EMA 20 y EMA 50 alineadas a la baja."
                sell_points += self.trend_weight * 0.9
            else:
                trend_score = 45.0
                trend_reason = "Precio oscilando entre medias móviles (rango o consolidación)."
        factors.append(FactorScore(
            name="Tendencia",
            weight=self.trend_weight,
            score=trend_score,
            contribution=round((trend_score / 100.0) * self.trend_weight, 2),
            reason=trend_reason
        ))

        # 2. MOMENTUM (Weight 20)
        mom_score = 50.0
        mom_reason = "Momentum en rango neutral."
        rsi = indicators.rsi or 50.0
        macd_hist = indicators.macd_hist or 0.0
        if rsi >= 50 and macd_hist > 0:
            if 50 <= rsi <= 68:
                mom_score = 90.0
                mom_reason = f"RSI alcista saludable ({rsi:.1f}) con histograma MACD positivo en expansión."
                buy_points += self.momentum_weight * 0.9
            elif 68 < rsi <= 75:
                mom_score = 75.0
                mom_reason = f"RSI alcista fuerte ({rsi:.1f}) con histograma MACD positivo."
                buy_points += self.momentum_weight * 0.75
            else:
                mom_score = 55.0
                mom_reason = f"RSI en sobrecompra ({rsi:.1f}); confluencia alcista con precaución por posible agotamiento."
                buy_points += self.momentum_weight * 0.55
        elif rsi < 50 and macd_hist < 0:
            if 32 <= rsi <= 50:
                mom_score = 90.0
                mom_reason = f"RSI bajista sostenido ({rsi:.1f}) con histograma MACD negativo acelerando."
                sell_points += self.momentum_weight * 0.9
            elif 25 <= rsi < 32:
                mom_score = 75.0
                mom_reason = f"RSI bajista fuerte ({rsi:.1f}) con histograma MACD negativo."
                sell_points += self.momentum_weight * 0.75
            else:
                mom_score = 55.0
                mom_reason = f"RSI en sobreventa ({rsi:.1f}); presión bajista alta con riesgo de rebote."
                sell_points += self.momentum_weight * 0.55
        factors.append(FactorScore(
            name="Momentum",
            weight=self.momentum_weight,
            score=mom_score,
            contribution=round((mom_score / 100.0) * self.momentum_weight, 2),
            reason=mom_reason
        ))

        # 3. VOLUMEN (Weight 15)
        vol_score = 50.0
        vol_reason = "Volumen dentro del promedio habitual."
        rel_vol = indicators.relative_volume or 1.0
        if rel_vol >= 1.5:
            vol_score = 90.0
            vol_reason = f"Volumen relativo destacado ({rel_vol:.2f}x de su media de 20 periodos), confirmando interés institucional."
            if buy_points > sell_points:
                buy_points += self.volume_weight * 0.9
            elif sell_points > buy_points:
                sell_points += self.volume_weight * 0.9
        elif rel_vol < 0.7:
            vol_score = 35.0
            vol_reason = f"Bajo volumen relativo ({rel_vol:.2f}x); falta de convicción en el movimiento."
        else:
            vol_score = 65.0
            vol_reason = f"Volumen normal ({rel_vol:.2f}x) respaldando la liquidez."
            if buy_points > sell_points:
                buy_points += self.volume_weight * 0.65
            elif sell_points > buy_points:
                sell_points += self.volume_weight * 0.65
        factors.append(FactorScore(
            name="Volumen",
            weight=self.volume_weight,
            score=vol_score,
            contribution=round((vol_score / 100.0) * self.volume_weight, 2),
            reason=vol_reason
        ))

        # 4. ESTRUCTURA DEL MERCADO (Weight 20)
        struct_score = 50.0
        struct_reason = f"Estructura de mercado: {structure.trend}."
        if structure.trend == "BULLISH":
            struct_score = 85.0
            struct_reason = "Secuencia de máximos y mínimos crecientes respetando zonas de soporte."
            buy_points += self.structure_weight * 0.85
            if structure.breakout == "BULLISH_BREAKOUT":
                struct_score = 95.0
                struct_reason += " Ruptura confirmada de resistencia relevante."
                buy_points += self.structure_weight * 0.1
        elif structure.trend == "BEARISH":
            struct_score = 85.0
            struct_reason = "Secuencia de máximos y mínimos decrecientes por debajo de resistencias."
            sell_points += self.structure_weight * 0.85
            if structure.breakout == "BEARISH_BREAKDOWN":
                struct_score = 95.0
                struct_reason += " Ruptura a la baja confirmada de soporte relevante."
                sell_points += self.structure_weight * 0.1
        factors.append(FactorScore(
            name="Estructura",
            weight=self.structure_weight,
            score=struct_score,
            contribution=round((struct_score / 100.0) * self.structure_weight, 2),
            reason=struct_reason
        ))

        # 5. VOLATILIDAD (Weight 10)
        volat_score = 70.0
        atr = indicators.atr or 0.0
        bb_width = indicators.bollinger_width or 0.0
        volat_reason = f"Volatilidad controlada con ATR de {atr:.4f}."
        if bb_width > 0.08:
            volat_score = 60.0
            volat_reason = f"Bandas de Bollinger en expansión (ancho {bb_width:.3f}); alta volatilidad."
        elif bb_width < 0.02 and bb_width > 0:
            volat_score = 80.0
            volat_reason = f"Compresión de volatilidad (Squeeze BB {bb_width:.3f}); potencial movimiento inminente."

        # Add volatility contribution to dominant bias when market is trending
        if buy_points > sell_points and buy_points >= 30:
            buy_points += (volat_score / 100.0) * self.volatility_weight
        elif sell_points > buy_points and sell_points >= 30:
            sell_points += (volat_score / 100.0) * self.volatility_weight

        factors.append(FactorScore(
            name="Volatilidad",
            weight=self.volatility_weight,
            score=volat_score,
            contribution=round((volat_score / 100.0) * self.volatility_weight, 2),
            reason=volat_reason
        ))

        # 6. CONFIRMACIÓN MULTITEMPORAL (Weight 10)
        mtf_score = 50.0
        mtf_reason = f"Temporalidad superior en estado: {higher_tf_trend}."
        if higher_tf_trend == "BULLISH" and buy_points > sell_points:
            mtf_score = 90.0
            mtf_reason = "Alineación positiva con la tendencia de la temporalidad superior."
            buy_points += self.multitimeframe_weight * 0.9
        elif higher_tf_trend == "BEARISH" and sell_points > buy_points:
            mtf_score = 90.0
            mtf_reason = "Alineación bajista con la tendencia de la temporalidad superior."
            sell_points += self.multitimeframe_weight * 0.9
        factors.append(FactorScore(
            name="Multitemporal",
            weight=self.multitimeframe_weight,
            score=mtf_score,
            contribution=round((mtf_score / 100.0) * self.multitimeframe_weight, 2),
            reason=mtf_reason
        ))

        # Determine direction and total score
        direction = "WAIT"
        if buy_points >= 65 and buy_points > (sell_points + 15):
            direction = "BUY"
            final_score = min(buy_points, 100.0)
        elif sell_points >= 65 and sell_points > (buy_points + 15):
            direction = "SELL"
            final_score = min(sell_points, 100.0)
        elif max(buy_points, sell_points) < 40:
            direction = "NO_TRADE"
            final_score = max(buy_points, sell_points)
        else:
            direction = "WAIT"
            final_score = max(buy_points, sell_points)

        final_score = round(final_score, 1)

        # Build justification
        classification = self.classify_score(final_score)
        justification = (
            f"Evaluación técnica: {direction} con puntuación {final_score}/100 ({classification}). "
            f"{trend_reason} {mom_reason} {struct_reason}"
        )

        return final_score, direction, factors, justification
