import asyncio
from typing import List, Optional
from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database.session import get_db
from app.models.signal import SignalModel
from app.market_data.manager import market_data_manager
from app.market_data.binance import CURATED_PAIRS
from app.signal_engine.engine import signal_engine
from app.alerts.manager import alert_manager
from app.schemas.signals import SignalResponse, SignalListResponse

router = APIRouter(tags=["Signals"])


@router.get("/signals", response_model=SignalResponse)
async def get_current_signal(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1h"),
    market: str = Query("crypto"),
    trading_style: str = Query("day_trading"),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Fetch candles
        candles_res = await market_data_manager.get_candles(symbol, timeframe, market, limit=200)

        # Higher timeframe for confirmation
        htf_map = {"1m": "5m", "3m": "15m", "5m": "1h", "15m": "1h", "30m": "4h", "1h": "4h", "4h": "1d", "1d": "1w"}
        htf = htf_map.get(timeframe, "4h")
        htf_candles = None
        try:
            htf_res = await market_data_manager.get_candles(symbol, htf, market, limit=100)
            htf_candles = htf_res.candles
        except Exception:
            pass

        signal = signal_engine.generate_signal(
            symbol=symbol,
            timeframe=timeframe,
            candles=candles_res.candles,
            market=market,
            trading_style=trading_style,
            higher_tf_candles=htf_candles
        )

        # Check for alert trigger
        await alert_manager.evaluate_signal_for_alerts(signal)

        # Save to DB if score >= 60
        if signal.score >= 60 and signal.direction in ["BUY", "SELL"]:
            try:
                db_signal = SignalModel(
                    symbol=signal.symbol,
                    market=signal.market,
                    direction=signal.direction,
                    timeframe=signal.timeframe,
                    trading_style=signal.trading_style,
                    reference_price=signal.reference_price,
                    entry_price=signal.entry_price,
                    stop_loss=signal.stop_loss,
                    take_profit_1=signal.take_profit_1,
                    take_profit_2=signal.take_profit_2,
                    risk_reward=signal.risk_reward,
                    score=signal.score,
                    status=signal.status,
                    data_source=signal.data_source,
                    data_status=signal.data_status,
                    justification=signal.justification,
                    factors=[f.model_dump() for f in signal.factors],
                    indicators=signal.indicators
                )
                db.add(db_signal)
                await db.commit()
                signal.id = db_signal.id
            except Exception:
                await db.rollback()

        return signal
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando señal: {str(e)}")


@router.get("/signals/history", response_model=SignalListResponse)
async def get_signal_history(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SignalModel).order_by(desc(SignalModel.created_at)).limit(limit))
    records = result.scalars().all()

    items = []
    for r in records:
        items.append(SignalResponse(
            id=r.id,
            symbol=r.symbol,
            market=r.market,
            direction=r.direction,
            timeframe=r.timeframe,
            trading_style=r.trading_style or "day_trading",
            reference_price=r.reference_price,
            entry_price=r.entry_price,
            stop_loss=r.stop_loss,
            take_profit_1=r.take_profit_1,
            take_profit_2=r.take_profit_2,
            risk_reward=r.risk_reward,
            score=r.score,
            score_classification="Histórica",
            status=r.status,
            data_source=r.data_source,
            data_status=r.data_status,
            justification=r.justification or "",
            factors=[],
            indicators=r.indicators or {},
            created_at=r.created_at
        ))
    return SignalListResponse(signals=items, total=len(items))


@router.get("/signals/scan", response_model=List[SignalResponse])
async def scan_market_opportunities(
    market: str = Query("crypto"),
    timeframe: str = Query("1h"),
    trading_style: str = Query("day_trading"),
    min_score: float = Query(50.0)
):
    """
    Market Scanner: Analyzes all curated watchlist symbols in parallel
    and returns opportunities ranked by score.
    """
    symbols = [s for s, _, _ in CURATED_PAIRS[:8]]

    async def _scan_one(sym: str) -> Optional[SignalResponse]:
        try:
            res = await market_data_manager.get_candles(sym, timeframe, market, limit=120)
            sig = signal_engine.generate_signal(
                symbol=sym,
                timeframe=timeframe,
                candles=res.candles,
                market=market,
                trading_style=trading_style
            )
            return sig
        except Exception:
            return None

    tasks = [_scan_one(sym) for sym in symbols]
    results = await asyncio.gather(*tasks)

    valid_signals = [s for s in results if s is not None and s.score >= min_score]
    valid_signals.sort(key=lambda x: x.score, reverse=True)
    return valid_signals
