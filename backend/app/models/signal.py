from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from app.database.session import Base


class SignalModel(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(50), index=True, nullable=False)
    market = Column(String(20), default="crypto", index=True)
    direction = Column(String(10), nullable=False)  # BUY, SELL, WAIT, NO_TRADE
    timeframe = Column(String(10), nullable=False)
    trading_style = Column(String(20), default="day_trading")
    reference_price = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit_1 = Column(Float, nullable=False)
    take_profit_2 = Column(Float, nullable=False)
    risk_reward = Column(Float, nullable=False)
    score = Column(Float, nullable=False)
    status = Column(String(20), default="CONFIRMED")  # DETECTED, PENDING, CONFIRMED, INVALIDATED, EXPIRED
    data_source = Column(String(50), default="Binance Public API")
    data_status = Column(String(20), default="REALTIME")  # REALTIME, DELAYED, HISTORICAL, SIMULATED
    justification = Column(Text, nullable=True)
    factors = Column(JSON, nullable=True)
    indicators = Column(JSON, nullable=True)
    ai_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
