from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from app.database.session import Base


class BacktestRunModel(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(50), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False)
    strategy_name = Column(String(100), nullable=False)
    initial_capital = Column(Float, default=10000.0)
    final_capital = Column(Float, nullable=False)
    net_profit = Column(Float, nullable=False)
    net_profit_percent = Column(Float, nullable=False)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)
    profit_factor = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    max_drawdown_percent = Column(Float, default=0.0)
    expectancy = Column(Float, default=0.0)
    trades_json = Column(JSON, nullable=True)
    equity_curve = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
