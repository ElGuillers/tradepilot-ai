from fastapi import APIRouter, Query, HTTPException
from app.market_data.manager import market_data_manager
from app.indicators.calculator import TechnicalCalculator
from app.schemas.indicators import TechnicalAnalysisResult

router = APIRouter(tags=["Indicators"])


@router.get("/indicators", response_model=TechnicalAnalysisResult)
async def get_indicators(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1h"),
    market: str = Query("crypto")
):
    try:
        data_res = await market_data_manager.get_candles(symbol, timeframe, market, limit=200)
        return TechnicalCalculator.analyze(data_res.candles, symbol=symbol, timeframe=timeframe)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando indicadores: {str(e)}")
