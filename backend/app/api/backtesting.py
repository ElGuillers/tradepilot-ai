from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database.session import get_db
from app.models.backtest import BacktestRunModel
from app.market_data.manager import market_data_manager
from app.backtesting.engine import backtest_engine
from app.schemas.backtesting import BacktestRequest, BacktestResponse

router = APIRouter(tags=["Backtesting"])


@router.post("/backtesting", response_model=BacktestResponse)
async def run_backtest(req: BacktestRequest, db: AsyncSession = Depends(get_db)):
    try:
        # Fetch historical candles
        candles_res = await market_data_manager.get_candles(
            symbol=req.symbol,
            timeframe=req.timeframe,
            market=req.market,
            limit=req.limit_candles
        )
        if not candles_res.candles:
            raise HTTPException(status_code=400, detail="No se obtuvieron suficientes datos históricos para el backtest.")

        result = backtest_engine.run(candles_res.candles, req)

        # Store run in database
        try:
            db_run = BacktestRunModel(
                symbol=result.symbol,
                timeframe=result.timeframe,
                strategy_name=result.strategy,
                initial_capital=result.initial_capital,
                final_capital=result.final_capital,
                net_profit=result.net_profit,
                net_profit_percent=result.net_profit_percent,
                total_trades=result.total_trades,
                winning_trades=result.winning_trades,
                losing_trades=result.losing_trades,
                win_rate=result.win_rate_percent,
                profit_factor=result.profit_factor,
                max_drawdown=result.max_drawdown_percent,
                max_drawdown_percent=result.max_drawdown_percent,
                expectancy=result.expectancy_per_trade,
                trades_json=[t.model_dump() for t in result.trades[:50]],
                equity_curve=[e.model_dump() for e in result.equity_curve]
            )
            db.add(db_run)
            await db.commit()
        except Exception:
            await db.rollback()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ejecutando backtest: {str(e)}")


@router.get("/backtesting/results")
async def get_backtest_history(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(BacktestRunModel).order_by(desc(BacktestRunModel.created_at)).limit(10))
    runs = res.scalars().all()
    return [{
        "id": r.id,
        "symbol": r.symbol,
        "timeframe": r.timeframe,
        "strategy": r.strategy_name,
        "net_profit": r.net_profit,
        "win_rate": r.win_rate,
        "profit_factor": r.profit_factor,
        "total_trades": r.total_trades,
        "created_at": r.created_at
    } for r in runs]
