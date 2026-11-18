from app.ai.base import BaseAIProvider
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse, AIScenario
from app.schemas.indicators import TechnicalAnalysisResult
from app.schemas.signals import SignalResponse


class RuleBasedAIProvider(BaseAIProvider):
    """
    Deterministic rule-based technical interpretation engine.
    Used when no external AI API key (Gemini/Claude) is configured.
    Guarantees 100% operational functionality without hallucinating prices.
    """
    @property
    def provider_name(self) -> str:
        return "Motor Técnico Sin IA (Reglas Cuantitativas)"

    async def analyze_market(
        self,
        request: AIAnalysisRequest,
        technical_data: TechnicalAnalysisResult,
        signal: SignalResponse
    ) -> AIAnalysisResponse:
        price = technical_data.current_price
        ind = technical_data.indicators
        struct = technical_data.structure

        # Build confluences
        confluences = []
        contradictions = []

        if ind.rsi:
            if ind.rsi > 50:
                confluences.append(f"RSI en zona compradora ({ind.rsi:.1f}).")
            else:
                confluences.append(f"RSI en zona vendedora ({ind.rsi:.1f}).")

        if ind.macd_hist is not None:
            if ind.macd_hist > 0 and signal.direction == "BUY":
                confluences.append("Histograma MACD positivo confirmando impulso alcista.")
            elif ind.macd_hist < 0 and signal.direction == "SELL":
                confluences.append("Histograma MACD negativo confirmando presión vendedora.")
            elif ind.macd_hist < 0 and signal.direction == "BUY":
                contradictions.append("Alerta: Histograma MACD aún negativo mientras la señal sugiere compra.")
            elif ind.macd_hist > 0 and signal.direction == "SELL":
                contradictions.append("Alerta: Histograma MACD positivo mientras la señal sugiere venta.")

        if ind.relative_volume and ind.relative_volume > 1.2:
            confluences.append(f"Volumen superior a la media ({ind.relative_volume:.2f}x).")
        elif ind.relative_volume and ind.relative_volume < 0.8:
            contradictions.append("Volumen por debajo del promedio; liquidez reducida en la sesión.")

        # Trend summary
        trend_summary = (
            f"El activo {request.symbol} en {request.timeframe} presenta estructura {struct.trend} con cotización actual en {price:.4f}. "
            f"Medias móviles EMA 20 ({ind.ema_20 or 'N/A'}) y EMA 50 ({ind.ema_50 or 'N/A'})."
        )

        # Scenarios
        sup = struct.supports[0] if struct.supports else round(price * 0.98, 4)
        res = struct.resistances[0] if struct.resistances else round(price * 1.02, 4)

        bullish_scenario = AIScenario(
            bias="ALCISTA",
            trigger=f"Consolidación o superación con volumen de {res:.4f}",
            target=round(price + (price - sup), 4),
            invalidation=sup,
            explanation=f"Búsqueda de liquidez superior si el precio defiende el soporte clave de {sup:.4f}."
        )

        bearish_scenario = AIScenario(
            bias="BAJISTA",
            trigger=f"Pérdida con cierre de vela del nivel {sup:.4f}",
            target=round(price - (res - price), 4),
            invalidation=res,
            explanation=f"Presión a la baja hacia nuevos mínimos si es rechazado en la resistencia de {res:.4f}."
        )

        recommendation = (
            f"Sesgo actual: {signal.direction} (Puntuación {signal.score}/100 - {signal.score_classification}). "
            f"Niveles hipotéticos: Entrada {signal.entry_price}, Stop Loss {signal.stop_loss}, Take Profit {signal.take_profit_1}."
        )

        return AIAnalysisResponse(
            symbol=request.symbol,
            timeframe=request.timeframe,
            provider_used="rule_based (Modo Sin IA)",
            status="no_ai_mode",
            summary=trend_summary,
            trend_interpretation=f"Estructura técnica identificada: {struct.trend}. {signal.justification}",
            confluences=confluences if confluences else ["Sin confluencias dominantes detectadas."],
            contradictions=contradictions if contradictions else ["Sin divergencias críticas encontradas."],
            bullish_scenario=bullish_scenario,
            bearish_scenario=bearish_scenario,
            recommendation_summary=recommendation,
            discrepancy_with_technical=None
        )
