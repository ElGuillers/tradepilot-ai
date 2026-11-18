import logging
from typing import Optional, Dict, Any
from app.core.config import settings
from app.ai.base import BaseAIProvider
from app.ai.rule_based_provider import RuleBasedAIProvider
from app.ai.gemini_provider import GeminiAIProvider
from app.ai.claude_provider import ClaudeAIProvider
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse
from app.schemas.indicators import TechnicalAnalysisResult
from app.schemas.signals import SignalResponse

logger = logging.getLogger(__name__)


class AIManager:
    def __init__(self):
        self.rule_based_provider = RuleBasedAIProvider()
        self.gemini_provider = GeminiAIProvider()
        self.claude_provider = ClaudeAIProvider()

    def get_provider(self, requested: Optional[str] = None) -> BaseAIProvider:
        prov = (requested or settings.AI_PROVIDER).lower()

        if prov == "gemini" and settings.GEMINI_API_KEY:
            return self.gemini_provider
        elif prov == "claude" and settings.ANTHROPIC_API_KEY:
            return self.claude_provider
        else:
            # Fallback to zero-dependency rule-based provider
            return self.rule_based_provider

    async def analyze(
        self,
        request: AIAnalysisRequest,
        technical_data: TechnicalAnalysisResult,
        signal: SignalResponse
    ) -> AIAnalysisResponse:
        provider = self.get_provider(request.provider)
        try:
            return await provider.analyze_market(request, technical_data, signal)
        except Exception as e:
            logger.warning(f"AI Provider {provider.provider_name} failed: {e}. Falling back to Rule-Based engine.")
            fallback_res = await self.rule_based_provider.analyze_market(request, technical_data, signal)
            fallback_res.discrepancy_with_technical = f"Nota: Proveedor IA principal no disponible ({str(e)}). Se utilizó motor técnico cuantitativo."
            return fallback_res

    def get_status(self) -> Dict[str, Any]:
        return {
            "current_provider": settings.AI_PROVIDER,
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "claude_configured": bool(settings.ANTHROPIC_API_KEY),
            "no_ai_mode_ready": True
        }


ai_manager = AIManager()
