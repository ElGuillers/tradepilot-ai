from typing import Optional
from pydantic import BaseModel, Field


class RiskCalculationRequest(BaseModel):
    account_balance: float = Field(default=10000.0, gt=0)
    risk_percentage: float = Field(default=1.5, gt=0, le=100)
    entry_price: float = Field(gt=0)
    stop_loss: float = Field(gt=0)
    take_profit: float = Field(gt=0)
    max_simultaneous_trades: int = Field(default=3, ge=1)
    direction: str = Field(default="BUY")  # BUY or SELL


class RiskCalculationResponse(BaseModel):
    account_balance: float
    risk_percentage: float
    monetary_risk: float
    stop_loss_distance: float
    stop_loss_percent: float
    position_size_units: float
    position_value: float
    take_profit_distance: float
    take_profit_percent: float
    risk_reward_ratio: float
    potential_profit: float
    potential_loss: float
    is_valid_risk_reward: bool
    risk_profile: str  # Conservador, Moderado, Agresivo
    disclaimer: str = (
        "Los cálculos de riesgo son únicamente simulaciones teóricas con fines educativos "
        "y de análisis técnico. No constituyen asesoramiento financiero ni recomendaciones de inversión."
    )
