import json
import logging
from typing import Optional
from app.ai.base import BaseAIProvider
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse, AIScenario
from app.schemas.indicators import TechnicalAnalysisResult
from app.schemas.signals import SignalResponse
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self._provider_name = "Google Gemini (Official API)"

    @property
    def provider_name(self) -> str:
        return self._provider_name

    async def analyze_market(
        self,
        request: AIAnalysisRequest,
        technical_data: TechnicalAnalysisResult,
        signal: SignalResponse
    ) -> AIAnalysisResponse:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY no configurada. Configure su API key en los ajustes o en el archivo .env.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key)

        prompt = f"""
Actúa como un analista cuantitativo senior de mercados financieros.
Analiza los siguientes datos técnicos estructurados reales obtenidos de la plataforma TradePilot AI:

Activo: {request.symbol} ({request.market})
Temporalidad: {request.timeframe}
Precio Actual: {technical_data.current_price}

Indicadores Técnicos:
- RSI (14): {technical_data.indicators.rsi}
- MACD Line: {technical_data.indicators.macd_line}, Signal: {technical_data.indicators.macd_signal}, Histograma: {technical_data.indicators.macd_hist}
- EMAs: 9: {technical_data.indicators.ema_9}, 20: {technical_data.indicators.ema_20}, 50: {technical_data.indicators.ema_50}, 200: {technical_data.indicators.ema_200}
- Bandas Bollinger: Superior: {technical_data.indicators.bollinger_upper}, Media: {technical_data.indicators.bollinger_middle}, Inferior: {technical_data.indicators.bollinger_lower}
- ATR: {technical_data.indicators.atr}
- Volumen Relativo: {technical_data.indicators.relative_volume}x

Estructura de Mercado:
- Tendencia: {technical_data.structure.trend}
- Soportes: {technical_data.structure.supports}
- Resistencias: {technical_data.structure.resistances}
- Ruptura: {technical_data.structure.breakout}

Señal Generada por Motor Cuantitativo:
- Dirección: {signal.direction}
- Puntuación: {signal.score}/100 ({signal.score_classification})
- Entrada Hipotética: {signal.entry_price}
- Stop Loss: {signal.stop_loss}
- Take Profit 1: {signal.take_profit_1}
- Justificación: {signal.justification}

INSTRUCCIONES OBLIGATORIAS:
1. No inventes precios ni noticias. Usa exclusivamente los datos numéricos provistos.
2. Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{{
  "summary": "Resumen ejecutivo del estado del activo...",
  "trend_interpretation": "Interpretación detallada de la tendencia y alineación de medias...",
  "confluences": ["Confluencia 1", "Confluencia 2"],
  "contradictions": ["Contradicción o advertencia de riesgo 1"],
  "bullish_scenario": {{
    "bias": "ALCISTA",
    "trigger": "Condición detonante alcista",
    "target": {signal.take_profit_1},
    "invalidation": {signal.stop_loss},
    "explanation": "Explicación del escenario alcista"
  }},
  "bearish_scenario": {{
    "bias": "BAJISTA",
    "trigger": "Condición detonante bajista",
    "target": {signal.entry_price * 0.97:.4f},
    "invalidation": {signal.entry_price * 1.02:.4f},
    "explanation": "Explicación del escenario bajista"
  }},
  "recommendation_summary": "Recomendación analítica final...",
  "discrepancy_with_technical": null
}}
"""
        # Execute call with timeout
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        try:
            raw_text = response.text.strip()
            parsed = json.loads(raw_text)

            bullish = None
            if parsed.get("bullish_scenario"):
                b = parsed["bullish_scenario"]
                bullish = AIScenario(
                    bias=b.get("bias", "ALCISTA"),
                    trigger=str(b.get("trigger", "")),
                    target=float(b.get("target", signal.take_profit_1)),
                    invalidation=float(b.get("invalidation", signal.stop_loss)),
                    explanation=str(b.get("explanation", ""))
                )

            bearish = None
            if parsed.get("bearish_scenario"):
                be = parsed["bearish_scenario"]
                bearish = AIScenario(
                    bias=be.get("bias", "BAJISTA"),
                    trigger=str(be.get("trigger", "")),
                    target=float(be.get("target", signal.entry_price * 0.97)),
                    invalidation=float(be.get("invalidation", signal.entry_price * 1.02)),
                    explanation=str(be.get("explanation", ""))
                )

            return AIAnalysisResponse(
                symbol=request.symbol,
                timeframe=request.timeframe,
                provider_used="gemini-2.5-flash",
                status="success",
                summary=parsed.get("summary", ""),
                trend_interpretation=parsed.get("trend_interpretation", ""),
                confluences=parsed.get("confluences", []),
                contradictions=parsed.get("contradictions", []),
                bullish_scenario=bullish,
                bearish_scenario=bearish,
                recommendation_summary=parsed.get("recommendation_summary", ""),
                discrepancy_with_technical=parsed.get("discrepancy_with_technical")
            )
        except Exception as err:
            logger.error(f"Error parsing Gemini response: {err}")
            raise
