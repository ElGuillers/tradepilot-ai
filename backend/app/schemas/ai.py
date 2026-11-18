from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AIAnalysisRequest(BaseModel):
    symbol: str
    timeframe: str
    market: str = "crypto"
    include_scenarios: bool = True
    provider: Optional[str] = None  # None for default configured provider, "gemini", "claude", "none"


class AIScenario(BaseModel):
    bias: str  # ALCISTA, BAJISTA, NEUTRAL
    trigger: str
    target: float
    invalidation: float
    explanation: str


class AIAnalysisResponse(BaseModel):
    symbol: str
    timeframe: str
    provider_used: str  # "gemini" | "claude" | "none (rule-based technical engine)"
    status: str  # "success" | "no_ai_mode" | "error"
    summary: str
    trend_interpretation: str
    confluences: List[str]
    contradictions: List[str]
    bullish_scenario: Optional[AIScenario] = None
    bearish_scenario: Optional[AIScenario] = None
    recommendation_summary: str
    discrepancy_with_technical: Optional[str] = None
    disclaimer: str = (
        "El análisis generado por IA complementa el motor técnico y tiene propósito analítico. "
        "No predice el mercado con certeza ni representa una recomendación financiera."
    )
