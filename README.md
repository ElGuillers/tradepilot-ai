# 🚀 TradePilot AI • Quantitative Intelligence & Autonomous Radar

**TradePilot AI** es una plataforma institucional de análisis cuantitativo de mercados financieros y radar de alertas autónomo 24/7 impulsado por análisis técnico algorítmico, streaming en vivo e inteligencia artificial.

Diseñada con foco en **cero dependencias de pago**, máxima velocidad de carga (milisegundos) y adaptabilidad responsiva para traders que operan en **MetaTrader 4/5**, brokers CFD y exchanges de criptomonedas.

> [!IMPORTANT]
> **ENTORNO DE ANÁLISIS CUANTITATIVO Y ALERTAS (NO TRADES REALES):**  
> TradePilot AI está diseñada **exclusivamente para educación, confluencia matemática y alertas**. Por arquitectura de seguridad estricta, la plataforma nunca solicita claves privadas de exchanges ni contraseñas bancarias, garantizando riesgo cero de fondos.

---

## ⚡ Mercados & Cobertura de Feeds (100% Gratuitos y Sin Claves API)

| Mercado | Activos Monitoreados | Proveedor de Streaming | Siglas en Broker / MetaTrader |
| :--- | :--- | :--- | :--- |
| **🪙 Oro Spot 1:1** | Pax Gold (`PAXGUSDT`) físico respaldado 1:1 LBMA | Binance Public Streaming (WebSocket sub-ms) | `XAUUSD` / `GOLD` |
| **₿ Criptomonedas** | `BTC`, `ETH`, `SOL`, `BNB`, `XRP`, `ADA`, `DOGE`, `AVAX`, `LINK` | Binance Public API & WebSocket en vivo | `BTCUSD`, `ETHUSD`, `SOLUSD` |
| **📈 Wall Street** | `NVDA`, `TSLA`, `AAPL`, `MSFT`, `AMZN`, `GOOGL`, `META` | Yahoo Finance Public Chart Feed | `NVDA`, `TSLA`, `AAPL` |
| **📊 Índices** | `SPY` (S&P 500), `QQQ` (Nasdaq 100) | Yahoo Finance Public Chart Feed | `US500` / `SPX`, `US100` / `NAS100` |
| **💱 Forex** | `EUR/USD`, `GBP/USD` | Yahoo Finance Public Chart Feed | `EURUSD`, `GBPUSD` |

---

## 💎 Características Principales

1. **Radar Cuantitativo Autónomo 24/7 a Telegram:**
   - Un escáner en segundo plano analiza de forma ininterrumpida los activos principales en temporalidades de `15m` y `1h`.
   - Cuando detecta una **alta confluencia técnica ($\ge 70$ puntos)** o una **ruptura confirmada de estructura**, despacha automáticamente la alerta a tu Telegram con:
     - 🎯 **Precio de Entrada** exacto.
     - 🛑 **Stop Loss** técnico basado en ATR y mínimos/máximos de estructura.
     - 💰 **Take Profit** calculado para una relación riesgo/beneficio óptima.
     - 📊 Confluencias de indicadores y volumen.

2. **Gráficos Interactivos de TradingView:**
   - Construido con **TradingView Lightweight Charts v5**.
   - Velas japonesas en tiempo real, volumen con colores dinámicos, medias móviles exponenciales (**EMA 20**, **EMA 50**), líneas de Entrada, SL y TP.
   - Cruz de cursor con selector dinámico de fecha y hora local precisa (`HH:mm`).

3. **Directorio Multimercado de Alta Velocidad:**
   - Búsqueda instantánea tanto por símbolo (`PAXGUSDT`, `SPY`) como por siglas de broker (`XAUUSD`, `US500`).
   - Caché en memoria y ejecución concurrente con `asyncio.gather` para respuestas en ~50 milisegundos.
   - Sistema de favoritos persistente (`⭐ Favoritos`) sincronizado globalmente.

4. **Laboratorio de Backtesting & Calculadora de Riesgo:**
   - Simulación histórica barra por barra con curvas de capital (*equity curve*), cálculo de *drawdown*, *win rate* y *profit factor*.
   - Dimensionamiento de lotaje y riesgo según capital hipotético y tolerancia porcentual.

5. **Asistente de IA (Opcional):**
   - Interpretación cuántica de escenarios con **Google Gemini** o funcionamiento determinista al 100% sin claves.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS, Lightweight Charts 5, Lucide Icons.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (Async), HTTPX, Pandas, NumPy, SQLite (`aiosqlite`).
- **Nube & Contenedores:** Docker, Docker Compose, Blueprint de Render (`render.yaml`).

---

## ☁️ Guía de Despliegue en Render (Paso a Paso)

Render permite alojar el backend y el frontend para que el **Radar de Telegram funcione las 24 horas del día de forma gratuita**:

### Paso 1: Subir el proyecto a GitHub
En tu terminal local de Windows:
```bash
git add .
git commit -m "Deploy TradePilot AI"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

---

### Paso 2: Crear el Backend en Render (Web Service)
1. En el panel de Render ([dashboard.render.com](https://dashboard.render.com)), haz clic en el botón azul **New +** y selecciona **Web Services** *(la segunda opción de tu pantalla)*.
2. Conecta tu repositorio de GitHub.
3. Rellena los siguientes campos:
   - **Name:** `tradepilot-backend`
   - **Region:** Elige la más cercana (ej. *Oregon* o *Frankfurt*).
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
4. En la sección **Environment Variables (Variables de Entorno)**, añade:
   - `TELEGRAM_BOT_TOKEN`: *Tu token de @BotFather (si deseas alertas)*.
   - `TELEGRAM_CHAT_ID`: *Tu ID numérico de Telegram*.
   - `TELEGRAM_AUTO_ALERTS`: `True`
   - `TELEGRAM_MIN_SCORE`: `70.0`
5. Haz clic en **Create Web Service**.  
   *Render te dará una URL como: `https://tradepilot-backend.onrender.com`.*

---

### Paso 3: Crear el Frontend en Render (Static Site)
1. En Render, haz clic en **New +** y selecciona **Static Sites** *(la primera opción de tu pantalla)*.
2. Selecciona el mismo repositorio de GitHub.
3. Rellena los campos:
   - **Name:** `tradepilot-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. En **Environment Variables**:
   - `VITE_API_URL`: Pega la URL de tu backend generada en el paso anterior (ej. `https://tradepilot-backend.onrender.com/api`).
5. En **Redirects/Rewrites**:
   - Source: `/*` | Destination: `/index.html` | Action: `Rewrite`
6. Haz clic en **Create Static Site**.  
   *¡Listo! Tu TradePilot AI estará accesible públicamente y transmitiendo alertas en vivo.*

---

## 💻 Ejecución Local en Windows 11

Si prefieres usarlo en tu propia computadora:
1. Haz doble clic en el archivo **`iniciar_tradepilot.bat`**.
2. Levantará automáticamente el Backend en `http://127.0.0.1:8000` y el Frontend en `http://localhost:5173`.
3. Para apagarlo limpiamente, haz doble clic en **`apagar_tradepilot.bat`**.
