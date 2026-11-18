import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.market_data import Candle
from app.schemas.indicators import IndicatorValues, MarketStructure, TechnicalAnalysisResult


class TechnicalCalculator:
    """
    High-performance technical indicator calculator using Pandas and NumPy.
    Ensures safe handling of insufficient data, NaNs, and division by zero.
    """

    @staticmethod
    def candles_to_dataframe(candles: List[Candle]) -> pd.DataFrame:
        if not candles:
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])
        data = [{
            "timestamp": c.timestamp,
            "open": float(c.open),
            "high": float(c.high),
            "low": float(c.low),
            "close": float(c.close),
            "volume": float(c.volume)
        } for c in candles]
        df = pd.DataFrame(data)
        df = df.sort_values("timestamp").reset_index(drop=True)
        return df

    @classmethod
    def calculate_ema(cls, series: pd.Series, period: int) -> pd.Series:
        if len(series) < period:
            return pd.Series([np.nan] * len(series), index=series.index)
        return series.ewm(span=period, adjust=False).mean()

    @classmethod
    def calculate_sma(cls, series: pd.Series, period: int) -> pd.Series:
        if len(series) < period:
            return pd.Series([np.nan] * len(series), index=series.index)
        return series.rolling(window=period).mean()

    @classmethod
    def calculate_rsi(cls, series: pd.Series, period: int = 14) -> pd.Series:
        if len(series) <= period:
            return pd.Series([np.nan] * len(series), index=series.index)
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)

        avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

        rsi = pd.Series(50.0, index=series.index)
        only_gain = (avg_gain > 0) & (avg_loss == 0)
        only_loss = (avg_gain == 0) & (avg_loss > 0)
        normal = (avg_loss > 0)

        rsi.loc[only_gain] = 100.0
        rsi.loc[only_loss] = 0.0
        rs = avg_gain[normal] / avg_loss[normal]
        rsi.loc[normal] = 100.0 - (100.0 / (1.0 + rs))
        return rsi.fillna(50.0)

    @classmethod
    def calculate_macd(
        cls,
        series: pd.Series,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        if len(series) < slow:
            nans = pd.Series([np.nan] * len(series), index=series.index)
            return nans, nans, nans
        ema_fast = series.ewm(span=fast, adjust=False).mean()
        ema_slow = series.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    @classmethod
    def calculate_stochastic_rsi(
        cls,
        series: pd.Series,
        rsi_period: int = 14,
        stoch_period: int = 14,
        k_period: int = 3,
        d_period: int = 3
    ) -> Tuple[pd.Series, pd.Series]:
        rsi = cls.calculate_rsi(series, period=rsi_period)
        min_rsi = rsi.rolling(window=stoch_period).min()
        max_rsi = rsi.rolling(window=stoch_period).max()

        denom = max_rsi - min_rsi
        stoch = (rsi - min_rsi) / denom.replace(0, np.nan)
        stoch = stoch.fillna(0.5) * 100

        k = stoch.rolling(window=k_period).mean().fillna(50.0)
        d = k.rolling(window=d_period).mean().fillna(50.0)
        return k, d

    @classmethod
    def calculate_atr(cls, df: pd.DataFrame, period: int = 14) -> pd.Series:
        if len(df) < 2:
            return pd.Series([np.nan] * len(df), index=df.index)
        high = df["high"]
        low = df["low"]
        close_prev = df["close"].shift(1)

        tr1 = high - low
        tr2 = (high - close_prev).abs()
        tr3 = (low - close_prev).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
        return atr

    @classmethod
    def calculate_bollinger_bands(
        cls,
        series: pd.Series,
        period: int = 20,
        std_dev: float = 2.0
    ) -> Tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
        if len(series) < period:
            nans = pd.Series([np.nan] * len(series), index=series.index)
            return nans, nans, nans, nans
        sma = series.rolling(window=period).mean()
        rolling_std = series.rolling(window=period).std()
        upper = sma + (rolling_std * std_dev)
        lower = sma - (rolling_std * std_dev)
        width = (upper - lower) / sma.replace(0, np.nan)
        return upper, sma, lower, width

    @classmethod
    def calculate_market_structure(cls, df: pd.DataFrame) -> MarketStructure:
        """
        Identify swing points, support/resistance clusters, and trend structure.
        """
        if len(df) < 15:
            return MarketStructure(
                trend="SIDEWAYS",
                supports=[],
                resistances=[],
                swing_high=None,
                swing_low=None,
                breakout="NONE",
                structure_shift="NONE"
            )

        highs = df["high"].values
        lows = df["low"].values
        closes = df["close"].values
        n = len(df)

        # Detect swing points (window=3)
        swing_highs = []
        swing_lows = []
        for i in range(3, n - 3):
            if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                swing_highs.append(highs[i])
            if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                swing_lows.append(lows[i])

        current_price = closes[-1]
        
        # S&R levels: top recent swing points
        recent_sh = swing_highs[-5:] if swing_highs else [highs.max()]
        recent_sl = swing_lows[-5:] if swing_lows else [lows.min()]

        resistances = sorted([round(x, 4) for x in recent_sh if x > current_price])[:3]
        supports = sorted([round(x, 4) for x in recent_sl if x < current_price], reverse=True)[:3]

        # Trend direction using higher-highs and higher-lows
        trend = "SIDEWAYS"
        if len(recent_sh) >= 2 and len(recent_sl) >= 2:
            if recent_sh[-1] > recent_sh[-2] and recent_sl[-1] > recent_sl[-2]:
                trend = "BULLISH"
            elif recent_sh[-1] < recent_sh[-2] and recent_sl[-1] < recent_sl[-2]:
                trend = "BEARISH"
        
        # Fallback for steady monotonic trends without fractal pullbacks
        if trend == "SIDEWAYS":
            mid_idx = len(closes) // 2
            if current_price > closes[0] and current_price > closes[mid_idx]:
                trend = "BULLISH"
            elif current_price < closes[0] and current_price < closes[mid_idx]:
                trend = "BEARISH"

        # Breakout detection
        breakout = "NONE"
        if resistances and current_price > resistances[0]:
            breakout = "BULLISH_BREAKOUT"
        elif supports and current_price < supports[0]:
            breakout = "BEARISH_BREAKDOWN"

        # Market structure shift
        shift = "NONE"
        if trend == "BEARISH" and swing_highs and current_price > swing_highs[-1]:
            shift = "BULLISH_CHANGE"
        elif trend == "BULLISH" and swing_lows and current_price < swing_lows[-1]:
            shift = "BEARISH_CHANGE"

        return MarketStructure(
            trend=trend,
            supports=supports,
            resistances=resistances,
            swing_high=float(recent_sh[-1]) if recent_sh else None,
            swing_low=float(recent_sl[-1]) if recent_sl else None,
            breakout=breakout,
            structure_shift=shift
        )

    @classmethod
    def analyze(cls, candles: List[Candle], symbol: str = "ASSET", timeframe: str = "1h") -> TechnicalAnalysisResult:
        df = cls.candles_to_dataframe(candles)
        if df.empty or len(df) < 5:
            return TechnicalAnalysisResult(
                symbol=symbol,
                timeframe=timeframe,
                current_price=0.0,
                indicators=IndicatorValues(),
                structure=MarketStructure(trend="SIDEWAYS", supports=[], resistances=[])
            )

        close = df["close"]
        volume = df["volume"]

        # Trend
        ema_9 = cls.calculate_ema(close, 9)
        ema_20 = cls.calculate_ema(close, 20)
        ema_50 = cls.calculate_ema(close, 50)
        ema_200 = cls.calculate_ema(close, 200)

        sma_20 = cls.calculate_sma(close, 20)
        sma_50 = cls.calculate_sma(close, 50)
        sma_200 = cls.calculate_sma(close, 200)

        # Momentum
        rsi = cls.calculate_rsi(close, 14)
        macd_line, macd_signal, macd_hist = cls.calculate_macd(close)
        stoch_k, stoch_d = cls.calculate_stochastic_rsi(close)

        # Volatility
        atr = cls.calculate_atr(df, 14)
        bb_upper, bb_mid, bb_lower, bb_width = cls.calculate_bollinger_bands(close, 20, 2.0)

        # Volume
        vol_sma_20 = cls.calculate_sma(volume, 20)
        rel_vol = volume / vol_sma_20.replace(0, np.nan)
        last_rel_vol = rel_vol.iloc[-1] if not rel_vol.empty and not pd.isna(rel_vol.iloc[-1]) else 1.0
        volume_anomaly = bool(last_rel_vol > 2.0)

        structure = cls.calculate_market_structure(df)

        def _val(s: pd.Series) -> Optional[float]:
            if s.empty or pd.isna(s.iloc[-1]):
                return None
            return round(float(s.iloc[-1]), 4)

        current_indicators = IndicatorValues(
            ema_9=_val(ema_9),
            ema_20=_val(ema_20),
            ema_50=_val(ema_50),
            ema_200=_val(ema_200),
            sma_20=_val(sma_20),
            sma_50=_val(sma_50),
            sma_200=_val(sma_200),
            rsi=_val(rsi),
            macd_line=_val(macd_line),
            macd_signal=_val(macd_signal),
            macd_hist=_val(macd_hist),
            stoch_k=_val(stoch_k),
            stoch_d=_val(stoch_d),
            atr=_val(atr),
            bollinger_upper=_val(bb_upper),
            bollinger_middle=_val(bb_mid),
            bollinger_lower=_val(bb_lower),
            bollinger_width=_val(bb_width),
            volume=_val(volume),
            volume_sma=_val(vol_sma_20),
            relative_volume=round(float(last_rel_vol), 2) if not pd.isna(last_rel_vol) else 1.0,
            volume_anomaly=volume_anomaly
        )

        def _series_list(s: pd.Series, max_pts: int = 500) -> List[Optional[float]]:
            tail = s.tail(max_pts)
            return [None if pd.isna(x) else round(float(x), 4) for x in tail]

        series_data = {
            "ema_9": _series_list(ema_9),
            "ema_20": _series_list(ema_20),
            "ema_50": _series_list(ema_50),
            "ema_200": _series_list(ema_200),
            "sma_20": _series_list(sma_20),
            "sma_50": _series_list(sma_50),
            "sma_200": _series_list(sma_200),
            "rsi": _series_list(rsi),
            "macd_line": _series_list(macd_line),
            "macd_signal": _series_list(macd_signal),
            "macd_hist": _series_list(macd_hist),
            "stoch_k": _series_list(stoch_k),
            "stoch_d": _series_list(stoch_d),
            "bollinger_upper": _series_list(bb_upper),
            "bollinger_middle": _series_list(bb_mid),
            "bollinger_lower": _series_list(bb_lower)
        }

        return TechnicalAnalysisResult(
            symbol=symbol,
            timeframe=timeframe,
            current_price=float(close.iloc[-1]),
            indicators=current_indicators,
            structure=structure,
            indicator_series=series_data
        )
