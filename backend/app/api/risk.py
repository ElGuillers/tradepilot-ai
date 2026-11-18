from fastapi import APIRouter
from app.schemas.risk import RiskCalculationRequest, RiskCalculationResponse
from app.risk.calculator import risk_manager

router = APIRouter(tags=["Risk Management"])


@router.post("/risk/calculate", response_model=RiskCalculationResponse)
async def calculate_risk(req: RiskCalculationRequest):
    return risk_manager.calculate_position_risk(req)
