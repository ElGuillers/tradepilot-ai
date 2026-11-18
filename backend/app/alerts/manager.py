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
        Evaluates signals for both:
        1. Web App Real-Time Feed: Shows Rupturas (breakout), Compras (buy), Ventas (sell) and Setups (wait).
        2. Telegram Broadcast: STRICT VIP FILTER. Only sends confirmed BUY/SELL with score >= min_score (70+).
        """
        now = datetime.now(timezone.utc)
        sym = signal.symbol.upper()
        min_score = getattr(settings, "TELEGRAM_MIN_SCORE", 70.0)

        # Map to broker symbol
        broker_sym = "XAUUSD" if sym == "PAXGUSDT" else ("US500" if sym == "SPY" else ("US100" if sym == "QQQ" else (sym.replace("USDT", "USD") if sym.endswith("USDT") else sym)))

        breakout = signal.indicators.get("structure_breakout", "NONE")
        shift = signal.indicators.get("structure_shift", "NONE")

        color: Optional[str] = None
        category: Optional[str] = None
        title = ""

        # Categorize for Web App feed
        if breakout in ["BULLISH_BREAKOUT", "BEARISH_BREAKDOWN"] or shift in ["BULLISH_CHANGE", "BEARISH_CHANGE"]:
            color = "blue"
            category = "breakout"
            title = f"💥 Ruptura en {broker_sym} ({signal.timeframe})"
        elif signal.direction == "BUY" and signal.score >= 50:
            color = "green"
            category = "buy"
            title = f"🚀 COMPRA en {broker_sym} ({signal.score:.0f} pts)"
        elif signal.direction == "SELL" and signal.score >= 50:
            color = "red"
            category = "sell"
            title = f"⚠️ VENTA en {broker_sym} ({signal.score:.0f} pts)"
        elif signal.direction in ["WAIT", "NO_TRADE"] and signal.score >= 40:
            color = "yellow"
            category = "wait"
            title = f"👀 Monitoreo en {broker_sym} ({signal.score:.0f} pts)"

        if not color or not category:
            return

        # Anti-spam check (minimum 3 minutes between notifications for same symbol + timeframe + category)
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
            take_profit_2=signal.take_profit_2 if signal.take_profit_2 > 0 else None,
            risk_reward=signal.risk_reward if signal.risk_reward > 0 else None,
            broker_symbol=broker_sym,
            read=False
        )

        # 1. ALWAYS save to Web App Notification feed (Visible in web bell & list)
        self._notifications.insert(0, notif)
        if len(self._notifications) > 100:
            self._notifications.pop()

        # 2. Autonomous Telegram Broadcast: STRICT VIP ONLY!
        # Only sends if direction is BUY or SELL AND score >= min_score (70+)
        # Breakouts and monitoring setups stay in the Web App only, NEVER to Telegram.
        if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID and getattr(settings, "TELEGRAM_AUTO_ALERTS", True):
            if signal.direction in ["BUY", "SELL"] and signal.score >= min_score and color in ["green", "red"]:
                await self._send_telegram(notif, signal)

    async def _send_telegram(self, notif: AlertNotification, signal: Optional[SignalResponse] = None) -> None:
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            return
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"

        is_buy = notif.direction == "BUY"
        action_header = "🟢 <b>SEÑAL DE COMPRA (BUY)</b>" if is_buy else "🔴 <b>SEÑAL DE VENTA (SELL)</b>"
        quality_tag = "🔥 Alta Probabilidad" if notif.score >= 80 else "⚡ Oportunidad Confirmada"

        display_name = notif.broker_symbol or notif.symbol
        sub_name = f" ({notif.symbol})" if notif.broker_symbol and notif.broker_symbol != notif.symbol else ""

        entry = notif.entry_price or 0.0
        sl = notif.stop_loss or 0.0
        tp1 = notif.take_profit_1 or 0.0
        tp2 = getattr(notif, "take_profit_2", None) or (signal.take_profit_2 if signal else 0.0)

        sl_pct = abs((sl - entry) / entry * 100) if entry > 0 and sl > 0 else 0.0
        tp1_pct = abs((tp1 - entry) / entry * 100) if entry > 0 and tp1 > 0 else 0.0
        tp2_pct = abs((tp2 - entry) / entry * 100) if entry > 0 and tp2 > 0 else 0.0

        def fmt_price(p: float) -> str:
            if p >= 100:
                return f"${p:,.2f}"
            elif p >= 1:
                return f"${p:.3f}"
            else:
                return f"${p:.5f}"

        # Extract structured confluence bullets
        confluence_bullets = []
        if signal and signal.factors:
            for factor in signal.factors:
                r = factor.reason.strip()
                if r and not any(w in r.lower() for w in ["neutral", "sin tendencia", "sin oportunidad"]):
                    # Keep concise
                    if len(r) > 90:
                        r = r[:87] + "..."
                    confluence_bullets.append(f"• <b>{factor.name}:</b> {r}")
                if len(confluence_bullets) >= 3:
                    break

        if not confluence_bullets:
            confluence_bullets.append("• Confluencia técnica confirmada por indicadores clave.")

        bullets_str = "\n".join(confluence_bullets)

        rr_ratio = signal.risk_reward if signal and signal.risk_reward > 0 else 1.5

        duration_map = {
            "1m": "~3 a 8 minutos (Scalping ultra-rápido)",
            "5m": "~15 a 30 minutos (Scalping)",
            "15m": "~30 a 60 minutos (2 a 4 velas)",
            "30m": "~1 a 2 horas (Intradía)",
            "1h": "~2 a 6 horas (Day Trading / 2 a 6 velas)",
            "4h": "~1 a 3 días (Swing Trading)",
            "1d": "~3 a 7 días (Posicional)"
        }
        duration_est = duration_map.get(notif.timeframe, "~30 a 60 minutos")
        max_holding_rule = "60 min" if notif.timeframe == "15m" else ("6 horas" if notif.timeframe == "1h" else "24 horas")

        lines = [
            f"{action_header} | <b>TradePilot AI</b>",
            "━━━━━━━━━━━━━━━━━━━━━",
            f"📈 <b>Activo:</b> <code>{display_name}</code>{sub_name}",
            f"⏱ <b>Temporalidad:</b> {notif.timeframe}",
            f"⏳ <b>Duración Estimada:</b> {duration_est}",
            f"⭐ <b>Confluencia:</b> {notif.score:.0f}/100 [<i>{quality_tag}</i>]",
            "",
            "📍 <b>NIVELES DE OPERACIÓN:</b>",
            f"├─ 🔹 <b>Entrada:</b> {fmt_price(entry)}",
            f"├─ 🛑 <b>Stop Loss:</b> {fmt_price(sl)} (<code>-{sl_pct:.2f}%</code>)",
            f"├─ 🎯 <b>Take Profit 1:</b> {fmt_price(tp1)} (<code>+{tp1_pct:.2f}%</code>)",
        ]

        if tp2 and tp2 > 0:
            lines.append(f"└─ 🚀 <b>Take Profit 2:</b> {fmt_price(tp2)} (<code>+{tp2_pct:.2f}%</code>)")
        else:
            lines[-1] = lines[-1].replace("├─", "└─")

        lines.extend([
            "",
            f"⚖️ <b>Ratio Riesgo/Beneficio:</b> 1 : {rr_ratio:.1f}",
            "",
            "🧠 <b>RAZONES DE ENTRADA:</b>",
            bullets_str,
            "━━━━━━━━━━━━━━━━━━━━━",
            f"🛡️ <i>Gestión: Salir al tocar TP o SL. Si pasan más de {max_holding_rule} sin avance, cerrar o poner SL a precio de entrada.</i>"
        ])

        text = "\n".join(lines)

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
