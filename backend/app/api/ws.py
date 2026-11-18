import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import httpx
import websockets

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/live/{symbol}/{timeframe}")
async def websocket_live_kline(websocket: WebSocket, symbol: str, timeframe: str):
    """
    Streams real-time candle tick updates for the requested symbol and timeframe
    directly from Binance public WebSocket stream.
    """
    await websocket.accept()
    binance_uri = f"wss://stream.binance.com:9443/ws/{symbol.lower()}@kline_{timeframe}"

    try:
        async with websockets.connect(binance_uri) as b_ws:
            while True:
                # Receive tick from Binance
                message = await b_ws.recv()
                data = json.loads(message)
                if data.get("e") == "kline" and "k" in data:
                    k = data["k"]
                    payload = {
                        "symbol": symbol.upper(),
                        "timeframe": timeframe,
                        "timestamp": k["t"],
                        "open": float(k["o"]),
                        "high": float(k["h"]),
                        "low": float(k["l"]),
                        "close": float(k["c"]),
                        "volume": float(k["v"]),
                        "is_closed": bool(k["x"])
                    }
                    await websocket.send_json(payload)
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from WebSocket for {symbol} {timeframe}")
    except Exception as e:
        logger.warning(f"WebSocket relay exception for {symbol}: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
