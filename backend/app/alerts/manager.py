import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import httpx
from app.core.config import settings
from app.schemas.alerts import AlertCreate, AlertResponse, AlertNotification
from app.schemas.signals import SignalResponse

logger = logging.getLogger(__name__)


class AlertManager:
    def __init__(self):
        self._alerts: Dict[int, Dict[str, Any]] = {}
        self._notifications: List[AlertNotification] = []
        self._last_sent_cache: Dict[str, datetime] = {}
        self._next_id = 1

    def create_alert(self, alert_in: AlertCreate) -> AlertResponse:
        alert_id = self._next_id
        self._next_id += 1
        record = {
            "id": alert_id,
            "symbol": alert_in.symbol.upper(),
            "market": alert_in.market,
            "timeframe": alert_in.timeframe,
            "min_score": alert_in.min_score,
            "signal_type": alert_in.signal_type.upper(),
            "active": True,
            "telegram_notify": alert_in.telegram_notify,
            "created_at": datetime.now(timezone.utc),
            "last_triggered_at": None
        }
        self._alerts[alert_id] = record
        return AlertResponse(**record)

    def list_alerts(self) -> List[AlertResponse]:
        return [AlertResponse(**a) for a in self._alerts.values()]

    def delete_alert(self, alert_id: int) -> bool:
        if alert_id in self._alerts:
            del self._alerts[alert_id]
            return True
        return False

    def list_notifications(self, limit: int = 50) -> List[AlertNotification]:
        return self._notifications[:limit]

    def mark_all_read(self) -> int:
        count = 0
        for notif in self._notifications:
            if not notif.read:
                notif.read = True
                count += 1
        return count

    def mark_read(self, notif_id: str) -> bool:
        for notif in self._notifications:
            if notif.id == notif_id:
                notif.read = True
                return True
        return False

    async def evaluate_signal_for_alerts(self, signal: SignalResponse) -> None:
        """
        Evaluates signals and classifies them into 4 distinct color alerts:
        - 🟢 GREEN (high score BUY >= 70)
        - 🔴 RED (high score SELL >= 70)
        - 🔵 BLUE (breakout or structure shift)
        - 🟡 YELLOW (WAIT with score >= 60 in preparation)
        """
        now = datetime.now(timezone.utc)
        sym = signal.symbol.upper()
        breakout = signal.indicators.get("structure_breakout", "NONE")
        shift = signal.indicators.get("structure_shift", "NONE")

        color: Optional[str] = None
        category: Optional[str] = None
        title = ""

        # Map to broker symbol
        broker_sym = "XAUUSD" if sym == "PAXGUSDT" else ("US500" if sym == "SPY" else ("US100" if sym == "QQQ" else (sym.replace("USDT", "USD") if sym.endswith("USDT") else sym)))
        tag = f" [{broker_sym}]" if broker_sym != sym else ""

        if breakout in ["BULLISH_BREAKOUT", "BEARISH_BREAKDOWN"] or shift in ["BULLISH_CHANGE", "BEARISH_CHANGE"]:
            color = "blue"
            category = "breakout"
            title = f"💥 Ruptura en {sym}{tag} ({signal.timeframe})"
        elif signal.direction == "BUY" and signal.score >= 70:
            color = "green"
            category = "buy"
            title = f"🚀 COMPRA en {sym}{tag} ({signal.score:.0f} pts)"
        elif signal.direction == "SELL" and signal.score >= 70:
            color = "red"
            category = "sell"
            title = f"⚠️ VENTA en {sym}{tag} ({signal.score:.0f} pts)"
        elif signal.direction == "WAIT" and signal.score >= 60:
            color = "yellow"
            category = "wait"
            title = f"👀 Setup en {sym}{tag} ({signal.score:.0f} pts)"

        if not color or not category:
            return

        # Anti-spam check (minimum 3 minutes between notifications for same symbol + category)
        cache_key = f"{sym}:{signal.timeframe}:{category}"
        if cache_key in self._last_sent_cache:
            delta = (now - self._last_sent_cache[cache_key]).total_seconds()
            if delta < 180:
                return

        self._last_sent_cache[cache_key] = now

        notif = AlertNotification(
            id=f"al-{str(uuid.uuid4())[:6]}",
            timestamp=now,
            symbol=sym,
            market=signal.market,
            timeframe=signal.timeframe,
            direction=signal.direction,
            score=signal.score,
            color=color,
            category=category,
            title=title,
            message=signal.justification,
            entry_price=signal.entry_price if signal.entry_price > 0 else None,
            stop_loss=signal.stop_loss if signal.stop_loss > 0 else None,
            take_profit_1=signal.take_profit_1 if signal.take_profit_1 > 0 else None,
            read=False
        )

        self._notifications.insert(0, notif)
        if len(self._notifications) > 100:
            self._notifications.pop()

        telegram_sent = False

        # 1. Automatic Autonomous Telegram Broadcast for High-Probability Signals
        if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID and getattr(settings, "TELEGRAM_AUTO_ALERTS", True):
            min_score = getattr(settings, "TELEGRAM_MIN_SCORE", 70.0)
            is_high_conviction = (color in ["green", "red"] and signal.score >= min_score)
            is_breakout = (color == "blue")
            if is_high_conviction or is_breakout:
                await self._send_telegram(notif)
                telegram_sent = True

        # 2. Check user-defined manual alerts
        for alert_id, alert in list(self._alerts.items()):
            if not alert["active"] or alert["symbol"] != sym or alert["timeframe"] != signal.timeframe:
                continue
            if signal.score < alert["min_score"]:
                continue
            if alert["signal_type"] != "ANY" and alert["signal_type"] != signal.direction:
                continue

            alert["last_triggered_at"] = now
            if not telegram_sent and alert["telegram_notify"] and settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
                await self._send_telegram(notif)
                telegram_sent = True

    async def _send_telegram(self, notif: AlertNotification) -> None:
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            return
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        icon = "🟢" if notif.color == "green" else ("🔴" if notif.color == "red" else ("🔵" if notif.color == "blue" else "🟡"))
        text = (
            f"{icon} <b>TradePilot AI: {notif.title}</b>\n\n"
            f"📊 <b>Temporalidad:</b> {notif.timeframe} | <b>Puntuación:</b> {notif.score:.0f}/100\n"
            f"💡 <b>Análisis:</b> {notif.message}\n\n"
        )
        if notif.entry_price:
            text += f"🎯 <b>Entrada:</b> ${notif.entry_price:,.2f}\n"
        if notif.stop_loss:
            text += f"🛑 <b>Stop Loss:</b> ${notif.stop_loss:,.2f}\n"
        if notif.take_profit_1:
            text += f"💰 <b>Take Profit:</b> ${notif.take_profit_1:,.2f}\n"

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                await client.post(url, json={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": text,
                    "parse_mode": "HTML"
                })
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")


alert_manager = AlertManager()
