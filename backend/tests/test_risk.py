from app.schemas.risk import RiskCalculationRequest
from app.risk.calculator import risk_manager


def test_risk_calculation_buy():
    req = RiskCalculationRequest(
        account_balance=10000.0,
        risk_percentage=1.5,
        entry_price=100.0,
        stop_loss=95.0,
        take_profit=110.0,
        direction="BUY"
    )
    res = risk_manager.calculate_position_risk(req)

    assert res.monetary_risk == 150.0  # 1.5% of 10000
    assert res.stop_loss_distance == 5.0
    assert res.stop_loss_percent == 5.0
    assert res.position_size_units == 30.0  # 150 / 5
    assert res.position_value == 3000.0
    assert res.take_profit_distance == 10.0
    assert res.risk_reward_ratio == 2.0  # 10 / 5
    assert res.is_valid_risk_reward is True
    assert res.risk_profile == "Moderado"


def test_risk_calculation_sell():
    req = RiskCalculationRequest(
        account_balance=20000.0,
        risk_percentage=1.0,
        entry_price=50.0,
        stop_loss=52.0,
        take_profit=44.0,
        direction="SELL"
    )
    res = risk_manager.calculate_position_risk(req)

    assert res.monetary_risk == 200.0
    assert res.stop_loss_distance == 2.0
    assert res.risk_reward_ratio == 3.0
    assert res.risk_profile == "Conservador"
