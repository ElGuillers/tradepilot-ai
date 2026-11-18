from abc import ABC, abstractmethod
from typing import Dict, Any
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse
from app.schemas.indicators import TechnicalAnalysisResult
from app.schemas.signals import SignalResponse


class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def analyze_market(
        self,
        request: AIAnalysisRequest,
        technical_data: TechnicalAnalysisResult,
        signal: SignalResponse
    ) -> AIAnalysisResponse:
        pass
