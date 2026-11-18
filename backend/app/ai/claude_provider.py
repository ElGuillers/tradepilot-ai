import json
import logging
from typing import Optional
from app.ai.base import BaseAIProvider
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse, AIScenario
from app.schemas.indicators import TechnicalAnalysisResult
from app.schemas.signals import SignalResponse
from app.core.config import settings

logger = logging.getLogger(__name__)


class ClaudeAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self._provider_name = "Anthropic Claude API"

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
            raise ValueError("ANTHROPIC_API_KEY no configurada. Configure su API key en los ajustes.")

        import anthropic

        client = anthropic.AsyncAnthropic(api_key=self.api_key)

        prompt = f"""
Actúa como analista técnico cuantitativo. Analiza estos datos:
Activo: {request.symbol}, Temporalidad: {request.timeframe}, Precio: {technical_data.current_price}
RSI: {technical_data.indicators.rsi}, MACD Hist: {technical_data.indicators.macd_hist}
Señal técnica actual: {signal.direction} ({signal.score}/100)

Devuelve ÚNICAMENTE un JSON con:
{{
  "summary": "...",
  "trend_interpretation": "...",
  "confluences": ["..."],
  "contradictions": ["..."],
  "recommendation_summary": "..."
}}
"""
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        text = response.content[0].text
        data = json.loads(text)

        return AIAnalysisResponse(
            symbol=request.symbol,
            timeframe=request.timeframe,
            provider_used="claude-3-5-sonnet",
            status="success",
            summary=data.get("summary", ""),
            trend_interpretation=data.get("trend_interpretation", ""),
            confluences=data.get("confluences", []),
            contradictions=data.get("contradictions", []),
            bullish_scenario=None,
            bearish_scenario=None,
            recommendation_summary=data.get("recommendation_summary", "")
        )
