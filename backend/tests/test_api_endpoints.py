import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "TradePilot AI"
    assert data["features"]["real_trading_enabled"] is False


def test_markets_endpoint():
    response = client.get("/api/markets?market=crypto")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    assert items[0]["market"] == "crypto"


def test_market_data_endpoint():
    response = client.get("/api/market-data?symbol=BTCUSDT&timeframe=1h&limit=20")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "BTCUSDT"
    assert len(data["candles"]) == 20


def test_signals_endpoint():
    response = client.get("/api/signals?symbol=BTCUSDT&timeframe=1h")
    assert response.status_code == 200
    signal = response.json()
    assert signal["symbol"] == "BTCUSDT"
    assert signal["direction"] in ["BUY", "SELL", "WAIT", "NO_TRADE"]
    assert 0 <= signal["score"] <= 100
    assert len(signal["factors"]) > 0


def test_ai_analyze_no_key_mode():
    payload = {
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "market": "crypto",
        "include_scenarios": True,
        "provider": "none"
    }
    response = client.post("/api/ai/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_ai_mode"
    assert data["bullish_scenario"] is not None
    assert data["bearish_scenario"] is not None


def test_risk_calculator_endpoint():
    payload = {
        "account_balance": 10000.0,
        "risk_percentage": 2.0,
        "entry_price": 50000.0,
        "stop_loss": 48500.0,
        "take_profit": 53000.0,
        "direction": "BUY"
    }
    response = client.post("/api/risk/calculate", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["monetary_risk"] == 200.0
    assert res["risk_reward_ratio"] == 2.0


def test_backtesting_endpoint():
    payload = {
        "symbol": "BTCUSDT",
        "market": "crypto",
        "timeframe": "1h",
        "strategy": "confluence_breakout",
        "initial_capital": 10000.0,
        "limit_candles": 100
    }
    response = client.post("/api/backtesting", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["initial_capital"] == 10000.0
    assert len(res["equity_curve"]) > 0


def test_alerts_crud():
    # Create
    create_res = client.post("/api/alerts", json={
        "symbol": "ETHUSDT",
        "market": "crypto",
        "timeframe": "4h",
        "min_score": 80.0,
        "signal_type": "BUY"
    })
    assert create_res.status_code == 200
    alert = create_res.json()
    alert_id = alert["id"]
    assert alert["symbol"] == "ETHUSDT"

    # List
    list_res = client.get("/api/alerts")
    assert list_res.status_code == 200
    assert any(a["id"] == alert_id for a in list_res.json())

    # Delete
    del_res = client.delete(f"/api/alerts/{alert_id}")
    assert del_res.status_code == 200
