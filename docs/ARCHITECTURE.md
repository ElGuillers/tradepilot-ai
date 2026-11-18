# Arquitectura del Sistema — TradePilot AI

## 1. Visión General y Principios de Diseño
TradePilot AI es una plataforma modular y desacoplada de análisis cuantitativo de mercados financieros y alertas inteligentes. Su principio rector es: **Análisis y Alertas exclusivamente. Ejecución de operaciones reales prohibida por diseño.**

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (React + Vite + TS)                      |
|  Dashboard | Mercados | Gráficos (Lightweight Charts) | Escáner | Señales | IA   |
+-----------------------------------------------------------------------------------+
                                        | (REST API / JSON)
+-----------------------------------------------------------------------------------+
|                                 BACKEND (FastAPI Core)                            |
|  Endpoints: /api/health, /markets, /market-data, /indicators, /signals,           |
|             /ai/analyze, /backtesting, /risk/calculate, /alerts, /settings        |
+-----------------------------------------------------------------------------------+
       |                    |                    |                   |
       v                    v                    v                   v
+--------------+   +-----------------+   +---------------+   +-------------------+
| Market Data  |   | Indicator &     |   | AI Engine     |   | Risk & Backtest   |
| Adapters     |   | Signal Engine   |   | Providers     |   | Engines           |
+--------------+   +-----------------+   +---------------+   +-------------------+
| - Binance    |   | - EMA, SMA      |   | - Google      |   | - Risk Calculator |
|   Public API |   | - RSI, MACD     |   |   Gemini SDK  |   | - Position Sizer  |
| - TwelveData |   | - Stoch RSI     |   | - Anthropic   |   | - Event-Driven    |
|   Adapter    |   | - ATR, BB       |   |   Claude      |   |   Backtester      |
| - Alpaca     |   | - Volume Anom.  |   | - Rule-Based  |   |   (No Look-Ahead) |
|   Adapter    |   | - S&R Struct.   |   |   (Modo Sin   |   +-------------------+
+--------------+   | - 6-Factor      |   |    IA Seguro) |
                   |   Opportunity   |   +---------------+
                   |   Scorer (0-100)|
                   +-----------------+
                            |
                            v
             +------------------------------+
             | Database Layer (SQLAlchemy)  |
             | SQLite (Local) / PostgreSQL  |
             +------------------------------+
```

## 2. Componentes Principales

### 2.1 Adaptadores de Mercado (`app/market_data`)
- **`BaseMarketDataProvider`**: Interfaz abstracta para implementar cualquier fuente de datos sin tocar el motor principal.
- **`BinanceMarketDataProvider`**: Conexión a endpoints públicos oficiales de Binance (`/api/v3/ping`, `/api/v3/klines`, `/api/v3/ticker/24hr`). Identifica datos como `REALTIME`.
- **`MultiAssetProvider`**: Adaptador para Forex y Acciones con estado transparente `DELAYED` o `UNAVAILABLE` hasta configurar API keys gratuitas de Twelve Data o Alpaca.
- **`MarketDataManager`**: Administrador con memoria caché TTL (10s) para evitar sobrecargar los límites de velocidad de los proveedores.

### 2.2 Motor Técnico Cuantitativo (`app/indicators`)
- **`TechnicalCalculator`**: Implementación en Pandas y NumPy.
  - Medias: EMA 9, EMA 20, EMA 50, EMA 200, SMA 20, SMA 50, SMA 200.
  - Momentum: RSI (Wilder 14), MACD (12, 26, 9), Stochastic RSI (14, 14, 3, 3).
  - Volatilidad: ATR (14), Bandas de Bollinger (20, 2 std dev) y ancho relativo.
  - Volumen: Volumen relativo vs SMA 20 y detección de anomalías de volumen (> 2.0x).
  - Estructura de Mercado: Soportes y resistencias dinámicos, swing highs/lows, rupturas (breakouts) y cambios de estructura (CHoCH / MSS).

### 2.3 Sistema de Puntuación de Oportunidades y Señales (`app/signal_engine`)
- **`OpportunityScorer`**: Puntuación de 0 a 100 basada en 6 factores configurables:
  1. Tendencia (25%)
  2. Momentum (20%)
  3. Volumen (15%)
  4. Estructura (20%)
  5. Volatilidad (10%)
  6. Confirmación Multitemporal (10%)
- **`SignalEngine`**: Determina dirección (`BUY`, `SELL`, `WAIT`, `NO_TRADE`), estado (`CONFIRMED`, `PENDING`, `DETECTED`), y niveles hipotéticos:
  - Precio de Entrada
  - Stop Loss basado en ATR / swing structure
  - Take Profit 1 (R:R >= 1.5) y Take Profit 2 (R:R >= 2.5)

### 2.4 Gestión de Riesgo (`app/risk`)
- **`RiskManager`**: Cálculo de riesgo monetario exacto según porcentaje de capital hipotético, tamaño de posición en unidades del activo y valor en USD, y categorización del perfil (Conservador, Moderado, Agresivo).

### 2.5 Módulo de Inteligencia Artificial (`app/ai`)
- **`GeminiAIProvider`**: Integración con el SDK oficial `google-genai` usando `gemini-2.5-flash` con salida estructurada en JSON.
- **`ClaudeAIProvider`**: Adaptador preparado para Anthropic Claude.
- **`RuleBasedAIProvider` (Modo Sin IA)**: Motor analítico determinista que provee resúmenes, confluencias y escenarios alcistas/bajistas sin requerir ninguna clave API ni descargar modelos locales.

### 2.6 Motor de Backtesting Histórico (`app/backtesting`)
- **`BacktestEngine`**: Ejecución secuencial barra por barra sobre velas cerradas históricas reales.
- **Sin Look-Ahead Bias**: Las decisiones de entrada se toman estrictamente con datos cerrados en $t-1$ y ejecución en la apertura de $t$.
- Incorpora comisiones (0.075%) y slippage simulado (0.05%).
- Métricas: Win Rate, Profit Factor, Max Drawdown, Expectancy y curva de evolución del capital.
