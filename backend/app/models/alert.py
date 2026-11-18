from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from app.database.session import Base


class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    symbol = Column(String(50), nullable=False, index=True)
    market = Column(String(20), default="crypto")
    timeframe = Column(String(10), default="1h")
    min_score = Column(Float, default=75.0)
    signal_type = Column(String(20), default="ANY")  # BUY, SELL, ANY
    active = Column(Boolean, default=True)
    telegram_notify = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_triggered_at = Column(DateTime, nullable=True)
