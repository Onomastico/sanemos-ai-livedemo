"use client";

import { useMemo } from 'react';
import { useI18n } from '@/i18n/I18nContext';

const EMOTION_COLORS = {
  sadness: '#4A90D9', anger: '#D94A4A', fear: '#9B59B6',
  guilt: '#7F8C8D', hope: '#2ECC71', calm: '#1ABC9C',
  love: '#E91E8F', numbness: '#636E72', concentration: '#F39C12',
  surprise: '#E67E22', joy: '#F1C40F', anxiety: '#C0392B',
  confusion: '#BDC3C7', gratitude: '#27AE60',
};

const SOURCE_ICONS = { text: '\uD83D\uDCAC', voice: '\uD83C\uDF99\uFE0F', facial: '\uD83D\uDC41\uFE0F' };

const PAD = { top: 20, right: 20, bottom: 50, left: 35 };
const W = 600;
const H = 200;
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export default function EmotionTimeline({ emotionHistory = [], agentColor = '#888' }) {
  const { t } = useI18n();

  const { points, lines, emotions, tMin, tMax } = useMemo(() => {
    if (!emotionHistory || emotionHistory.length < 2)
      return { points: [], lines: [], emotions: [], tMin: 0, tMax: 1 };

    const sorted = [...emotionHistory].sort((a, b) => a.timestamp - b.timestamp);
    const tMin = sorted[0].timestamp;
    const tMax = sorted[sorted.length - 1].timestamp;
    const tRange = tMax - tMin || 1;

    const toX = (ts) => PAD.left + ((ts - tMin) / tRange) * PLOT_W;
    const toY = (intensity) => PAD.top + PLOT_H - ((Math.min(Math.max(intensity, 1), 5) - 1) / 4) * PLOT_H;

    const pts = sorted.map((d) => ({
      ...d,
      cx: toX(d.timestamp),
      cy: toY(d.intensity),
      color: EMOTION_COLORS[d.emotion] || agentColor,
      r: 3 + d.intensity,
    }));

    // Connect consecutive points of same source
    const bySource = {};
    pts.forEach((p) => {
      (bySource[p.source] = bySource[p.source] || []).push(p);
    });
    const lns = [];
    Object.values(bySource).forEach((arr) => {
      for (let i = 1; i < arr.length; i++) {
        lns.push({ x1: arr[i - 1].cx, y1: arr[i - 1].cy, x2: arr[i].cx, y2: arr[i].cy, color: arr[i].color });
      }
    });

    const uniqueEmotions = [...new Set(sorted.map((d) => d.emotion))];
    return { points: pts, lines: lns, emotions: uniqueEmotions, tMin, tMax };
  }, [emotionHistory, agentColor]);

  if (!emotionHistory || emotionHistory.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--fg-secondary)', padding: '2rem', fontSize: '0.9rem' }}>
        {t('summary.notEnoughData') || 'Not enough emotion data'}
      </div>
    );
  }

  const fmtTime = (ts) => {
    const s = Math.round((ts - tMin) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div>
      <h4 style={{ color: 'var(--fg)', marginBottom: 8, fontSize: '0.85rem' }}>{t('summary.emotionTimeline')}</h4>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: 'transparent' }}>
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((v) => {
          const y = PAD.top + PLOT_H - ((v - 1) / 4) * PLOT_H;
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--fg-alpha-10)" strokeWidth={0.5} />
              <text x={PAD.left - 6} y={y + 4} fill="var(--fg-secondary)" fontSize={9} textAnchor="end">{v}</text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const x = PAD.left + pct * PLOT_W;
          const ts = tMin + pct * (tMax - tMin);
          return (
            <text key={pct} x={x} y={PAD.top + PLOT_H + 14} fill="var(--fg-secondary)" fontSize={8} textAnchor="middle">
              {fmtTime(ts)}
            </text>
          );
        })}

        {/* Lines */}
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={1} opacity={0.4} />
        ))}

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.color} opacity={0.85} />
            <text x={p.cx} y={p.cy - p.r - 3} fontSize={8} textAnchor="middle">{SOURCE_ICONS[p.source]}</text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 6 }}>
        {emotions.map((em) => (
          <span key={em} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--fg-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: EMOTION_COLORS[em] || '#888', display: 'inline-block' }} />
            {(() => { const v = t(`emotions.${em}`); return (!v || v === `emotions.${em}`) ? em.charAt(0).toUpperCase() + em.slice(1) : v; })()}
          </span>
        ))}
      </div>
    </div>
  );
}
