from fastapi import APIRouter, HTTPException
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse
from app.market_data.manager import market_data_manager
from app.indicators.calculator import TechnicalCalculator
from app.signal_engine.engine import signal_engine
from app.ai.manager import ai_manager

router = APIRouter(tags=["AI Analysis"])


@router.get("/ai")
async def get_ai_status():
    return ai_manager.get_status()


@router.post("/ai/analyze", response_model=AIAnalysisResponse)
async def analyze_with_ai(request: AIAnalysisRequest):
    try:
        # Fetch actual market data
        candles_res = await market_data_manager.get_candles(
            request.symbol,
            request.timeframe,
            request.market,
            limit=200
        )
        if not candles_res.candles:
            raise HTTPException(status_code=400, detail="No se pudieron obtener velas del activo para análisis.")

        # Compute technicals
        tech_data = TechnicalCalculator.analyze(candles_res.candles, symbol=request.symbol, timeframe=request.timeframe)

        # Generate technical signal
        signal = signal_engine.generate_signal(
            symbol=request.symbol,
            timeframe=request.timeframe,
            candles=candles_res.candles,
            market=request.market
        )

        # Analyze with AI (Gemini / Claude / RuleBased fallback)
        return await ai_manager.analyze(request, tech_data, signal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis IA: {str(e)}")
