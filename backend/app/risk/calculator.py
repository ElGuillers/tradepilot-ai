from app.schemas.risk import RiskCalculationRequest, RiskCalculationResponse


class RiskManager:
    @staticmethod
    def calculate_position_risk(req: RiskCalculationRequest) -> RiskCalculationResponse:
        monetary_risk = req.account_balance * (req.risk_percentage / 100.0)

        # Distance to stop loss
        if req.direction == "BUY":
            sl_distance = max(0.000001, req.entry_price - req.stop_loss)
            tp_distance = max(0.0, req.take_profit - req.entry_price)
        else:  # SELL
            sl_distance = max(0.000001, req.stop_loss - req.entry_price)
            tp_distance = max(0.0, req.entry_price - req.take_profit)

        sl_percent = (sl_distance / req.entry_price) * 100.0
        tp_percent = (tp_distance / req.entry_price) * 100.0

        # Position size in asset units
        position_units = monetary_risk / sl_distance
        position_value = position_units * req.entry_price

        # Risk reward ratio
        risk_reward = round(tp_distance / sl_distance, 2) if sl_distance > 0 else 0.0

        potential_loss = monetary_risk
        potential_profit = position_units * tp_distance

        # Risk profile
        if req.risk_percentage <= 1.0:
            profile = "Conservador"
        elif req.risk_percentage <= 2.5:
            profile = "Moderado"
        else:
            profile = "Agresivo"

        return RiskCalculationResponse(
            account_balance=req.account_balance,
            risk_percentage=req.risk_percentage,
            monetary_risk=round(monetary_risk, 2),
            stop_loss_distance=round(sl_distance, 4),
            stop_loss_percent=round(sl_percent, 2),
            position_size_units=round(position_units, 4),
            position_value=round(position_value, 2),
            take_profit_distance=round(tp_distance, 4),
            take_profit_percent=round(tp_percent, 2),
            risk_reward_ratio=risk_reward,
            potential_profit=round(potential_profit, 2),
            potential_loss=round(potential_loss, 2),
            is_valid_risk_reward=bool(risk_reward >= 1.5),
            risk_profile=profile
        )


risk_manager = RiskManager()
