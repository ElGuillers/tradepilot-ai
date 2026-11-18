import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData } from 'lightweight-charts';
import type { Candle, SignalResponse } from '../types';
import type { LiveKlineUpdate } from '../services/websocket';

interface TradingChartProps {
  candles: Candle[];
  timeframe?: string;
  signal?: SignalResponse | null;
  indicatorsSeries?: Record<string, (number | null)[]>;
  liveCandle?: LiveKlineUpdate | null;
  height?: number;
}

interface HoveredInfo {
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  changePercent?: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  timeframe = '1h',
  signal,
  indicatorsSeries,
  liveCandle,
  height = 480
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [hoveredInfo, setHoveredInfo] = useState<HoveredInfo | null>(null);

  const isDailyOrWeekly = timeframe === '1d' || timeframe === '1w';

  // Format time for timescale crosshair
  const formatTimeForAxis = (timeInSec: number): string => {
    const date = new Date(timeInSec * 1000);
    if (isDailyOrWeekly) {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    }
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Initialize chart whenever candles or timeframe changes
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#334155',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: !isDailyOrWeekly,
        secondsVisible: false,
        rightOffset: 5,
      },
      localization: {
        locale: 'es-ES',
        dateFormat: 'dd MMM yyyy',
        timeFormatter: (time: any) => {
          const tNum = typeof time === 'number' ? time : Number(time);
          if (!isNaN(tNum)) {
            return formatTimeForAxis(tNum);
          }
          return String(time);
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series with live price line
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceLineVisible: true,
      priceLineWidth: 1,
      priceLineColor: '#38bdf8',
      lastValueVisible: true,
    });
    candleSeriesRef.current = candleSeries;

    const formattedCandles: CandlestickData[] = [];
    const volumeData: HistogramData[] = [];
    const seenTimes = new Set<number>();

    // Sort strictly chronological ascending
    const sortedCandles = [...candles].sort((a, b) => a.timestamp - b.timestamp);

    for (const c of sortedCandles) {
      if (
        c.open <= 0 ||
        c.high <= 0 ||
        c.low <= 0 ||
        c.close <= 0 ||
        isNaN(c.open) ||
        isNaN(c.high) ||
        isNaN(c.low) ||
        isNaN(c.close)
      ) {
        continue;
      }

      const timeInSec = Math.floor(c.timestamp / 1000);
      if (seenTimes.has(timeInSec)) continue;
      seenTimes.add(timeInSec);

      formattedCandles.push({
        time: timeInSec as any,
        open: c.open,
        high: Math.max(c.high, c.open, c.close),
        low: Math.min(c.low, c.open, c.close),
        close: c.close,
      });

      volumeData.push({
        time: timeInSec as any,
        value: Math.max(0, c.volume || 0),
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      });
    }

    candleSeries.setData(formattedCandles);

    // Initial default hovered info (latest candle)
    if (formattedCandles.length > 0) {
      const last = formattedCandles[formattedCandles.length - 1];
      const tSec = Number(last.time);
      const d = new Date(tSec * 1000);
      const tStr = isDailyOrWeekly
        ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        : d.toLocaleString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });

      const chg = last.open > 0 ? ((last.close - last.open) / last.open) * 100 : 0;
      setHoveredInfo({
        timeStr: tStr,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        changePercent: chg,
      });
    }

    // Volume series (overlay at bottom without projecting rogue labels on the price scale)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeries.setData(volumeData);
    volumeSeriesRef.current = volumeSeries;

    // Optional EMA Lines
    if (indicatorsSeries) {
      if (indicatorsSeries.ema_20 && indicatorsSeries.ema_20.length === formattedCandles.length) {
        const ema20Series = chart.addSeries(LineSeries, {
          color: '#eab308',
          lineWidth: 1,
          title: 'EMA 20',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const ema20Data: LineData[] = [];
        indicatorsSeries.ema_20.forEach((val, idx) => {
          if (val !== null && formattedCandles[idx]) {
            ema20Data.push({ time: formattedCandles[idx].time, value: val });
          }
        });
        ema20Series.setData(ema20Data);
      }

      if (indicatorsSeries.ema_50 && indicatorsSeries.ema_50.length === formattedCandles.length) {
        const ema50Series = chart.addSeries(LineSeries, {
          color: '#06b6d4',
          lineWidth: 1,
          title: 'EMA 50',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const ema50Data: LineData[] = [];
        indicatorsSeries.ema_50.forEach((val, idx) => {
          if (val !== null && formattedCandles[idx]) {
            ema50Data.push({ time: formattedCandles[idx].time, value: val });
          }
        });
        ema50Series.setData(ema50Data);
      }
    }

    // Price lines for trade levels (Entry, SL, TP1, TP2)
    if (signal && signal.direction !== 'WAIT' && signal.direction !== 'NO_TRADE') {
      if (signal.entry_price > 0) {
        candleSeries.createPriceLine({
          price: signal.entry_price,
          color: '#3b82f6',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `ENTRADA: ${signal.entry_price}`,
        });
      }
      if (signal.stop_loss > 0) {
        candleSeries.createPriceLine({
          price: signal.stop_loss,
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `STOP LOSS: ${signal.stop_loss}`,
        });
      }
      if (signal.take_profit_1 > 0) {
        candleSeries.createPriceLine({
          price: signal.take_profit_1,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `TP 1: ${signal.take_profit_1}`,
        });
      }
      if (signal.take_profit_2 > 0) {
        candleSeries.createPriceLine({
          price: signal.take_profit_2,
          color: '#059669',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: `TP 2: ${signal.take_profit_2}`,
        });
      }
    }

    // Interactive Crosshair Subscription for dynamic OHLC & exact time
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.seriesData ||
        !candleSeriesRef.current ||
        !param.seriesData.has(candleSeriesRef.current)
      ) {
        // Fallback to latest candle
        if (formattedCandles.length > 0) {
          const last = formattedCandles[formattedCandles.length - 1];
          const tSec = Number(last.time);
          const d = new Date(tSec * 1000);
          const tStr = isDailyOrWeekly
            ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            : d.toLocaleString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

          const chg = last.open > 0 ? ((last.close - last.open) / last.open) * 100 : 0;
          setHoveredInfo({
            timeStr: tStr,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            changePercent: chg,
          });
        }
        return;
      }

      const bar: any = param.seriesData.get(candleSeriesRef.current);
      if (bar) {
        const tSec = typeof param.time === 'number' ? param.time : Number(param.time);
        const d = new Date(tSec * 1000);
        const tStr = isDailyOrWeekly
          ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
          : d.toLocaleString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });

        const chg = bar.open > 0 ? ((bar.close - bar.open) / bar.open) * 100 : 0;
        setHoveredInfo({
          timeStr: tStr,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          changePercent: chg,
        });
      }
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [candles, timeframe, signal, indicatorsSeries, height, isDailyOrWeekly]);

  // Instant sub-millisecond tick mutation
  useEffect(() => {
    if (!liveCandle || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    try {
      const timeInSec = Math.floor(liveCandle.timestamp / 1000);
      candleSeriesRef.current.update({
        time: timeInSec as any,
        open: liveCandle.open,
        high: Math.max(liveCandle.high, liveCandle.open, liveCandle.close),
        low: Math.min(liveCandle.low, liveCandle.open, liveCandle.close),
        close: liveCandle.close,
      });

      volumeSeriesRef.current.update({
        time: timeInSec as any,
        value: Math.max(0, liveCandle.volume || 0),
        color: liveCandle.close >= liveCandle.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      });
    } catch (err) {
      // In case of any tick out-of-bounds error
    }
  }, [liveCandle]);

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
      {/* Dynamic OHLC + Exact Time Overlay Legend */}
      {hoveredInfo && (
        <div className="absolute top-2.5 left-3 z-10 flex flex-wrap items-center gap-2.5 sm:gap-4 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/90 text-[11px] font-mono shadow-md pointer-events-none backdrop-blur-sm">
          <span className="text-slate-300 font-bold">{hoveredInfo.timeStr}</span>
          <div className="flex items-center gap-2 text-slate-400">
            <span>O: <strong className="text-white">${hoveredInfo.open}</strong></span>
            <span>H: <strong className="text-white">${hoveredInfo.high}</strong></span>
            <span>L: <strong className="text-white">${hoveredInfo.low}</strong></span>
            <span>C: <strong className="text-white">${hoveredInfo.close}</strong></span>
            {hoveredInfo.changePercent !== undefined && (
              <span className={`font-bold ${hoveredInfo.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoveredInfo.changePercent >= 0 ? '+' : ''}{hoveredInfo.changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={chartContainerRef} className="w-full" style={{ height }} />
    </div>
  );
};
