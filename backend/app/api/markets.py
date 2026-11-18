from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from app.market_data.manager import market_data_manager
from app.schemas.market_data import AssetInfo, MarketOverviewItem, MarketDataResponse

router = APIRouter(tags=["Markets"])


@router.get("/markets", response_model=List[MarketOverviewItem])
async def get_markets_overview(market: Optional[str] = Query(None, description="crypto, forex, stocks, indices")):
    return await market_data_manager.get_overview(market)


@router.get("/assets", response_model=List[AssetInfo])
async def get_assets_list(market: Optional[str] = Query(None)):
    return await market_data_manager.get_assets(market)


@router.get("/market-data", response_model=MarketDataResponse)
async def get_market_data(
    symbol: str = Query(..., description="e.g. BTCUSDT"),
    timeframe: str = Query("1h", description="1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d"),
    market: str = Query("crypto", description="crypto, forex, stocks, indices"),
    limit: int = Query(200, ge=10, le=1000)
):
    try:
        return await market_data_manager.get_candles(symbol, timeframe, market, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo velas de {symbol}: {str(e)}")
