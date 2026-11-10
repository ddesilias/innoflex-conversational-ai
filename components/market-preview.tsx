'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  ChartLine,
  Check,
  List,
  SlidersHorizontal
} from '@phosphor-icons/react'
import styles from './market-preview.module.css'

const instruments = [
  {
    symbol: 'EUR / USD',
    name: 'Euro / Dollar américain',
    short: 'FX',
    base: 1.08,
    scale: 0.00016,
    digits: 5
  },
  {
    symbol: 'BTC / USD',
    name: 'Bitcoin / Dollar américain',
    short: '₿',
    base: 68000,
    scale: 48,
    digits: 0
  },
  {
    symbol: 'XAU / USD',
    name: 'Or / Dollar américain',
    short: 'Au',
    base: 2350,
    scale: 1.3,
    digits: 2
  }
]
const periods = ['15 min', '1 h', '4 h']
// Deterministic illustration, never a price feed or a prediction.
function candles(period: number) {
  return Array.from({ length: 52 }, (_, i) => {
    const open =
      45 + i * 0.72 + Math.sin(i * 0.54 + period) * 8 + Math.cos(i * 1.3) * 2
    const close = open + Math.sin(i * 2.13 + 0.7 + period) * 5
    return {
      open,
      close,
      high: Math.max(open, close) + 2 + (i % 4),
      low: Math.min(open, close) - 2 - (i % 3)
    }
  })
}

export function MarketPreview() {
  const [selected, setSelected] = useState(0)
  const [period, setPeriod] = useState(1)
  const titleId = useId()
  const instrument = instruments[selected]
  const data = candles(period + selected)
  const y = (value: number) => 310 - value * 2.7
  const price = (value: number) =>
    (instrument.base + value * instrument.scale).toLocaleString('fr-CA', {
      minimumFractionDigits: instrument.digits,
      maximumFractionDigits: instrument.digits
    })
  const last = data[data.length - 1]
  return (
    <div className={styles.terminal}>
      <div className={styles.topbar}>
        <span>
          <ChartLine size={19} weight="bold" /> Espace d’analyse
        </span>
        <span className={styles.demo}>DÉMONSTRATION · DONNÉES FICTIVES</span>
        <Link href="/trading-journal">
          Ouvrir mon journal <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className={styles.body}>
        <div className={styles.chartArea}>
          <div className={styles.toolbar}>
            <strong>{instrument.symbol}</strong>
            <span className={styles.divider} />
            <div
              role="group"
              aria-label="Période du graphique de démonstration"
            >
              {periods.map((p, i) => (
                <button
                  key={p}
                  aria-pressed={period === i}
                  onClick={() => setPeriod(i)}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className={styles.chartType}>
              <SlidersHorizontal size={16} /> Chandeliers
            </span>
          </div>
          <div className={styles.instrument}>
            <span className={styles.symbol}>{instrument.short}</span>
            <div>
              <h3>{instrument.name}</h3>
              <span>Scénario illustratif · {periods[period]}</span>
            </div>
            <strong>
              {price(last.close)}
              <small>Valeur simulée</small>
            </strong>
          </div>
          <div className={styles.graph}>
            <svg viewBox="0 0 840 350" role="img" aria-labelledby={titleId}>
              <title id={titleId}>
                Graphique en chandeliers fictif pour {instrument.symbol},
                période illustrative {periods[period]}. Aucun cours réel ni
                signal d’achat.
              </title>
              {[20, 40, 60, 80, 100].map(v => (
                <g key={v}>
                  <line x1="12" x2="760" y1={y(v)} y2={y(v)} stroke="#e9ecf2" />
                  <text x="772" y={y(v) + 4} fill="#687387" fontSize="10">
                    {price(v)}
                  </text>
                </g>
              ))}
              {[0, 1, 2, 3, 4, 5].map(v => (
                <line
                  key={v}
                  x1={20 + v * 145}
                  x2={20 + v * 145}
                  y1="20"
                  y2="315"
                  stroke="#f0f2f6"
                />
              ))}
              <rect
                x="12"
                y={y(69)}
                width="748"
                height="23"
                fill="#2962ff"
                opacity=".05"
              />
              <line
                x1="12"
                x2="760"
                y1={y(69)}
                y2={y(69)}
                stroke="#7d9af2"
                strokeDasharray="5 5"
              />
              <text x="22" y={y(69) - 8} fill="#5069a2" fontSize="10">
                Zone d’observation · exemple
              </text>
              {data.map((c, i) => {
                const color = c.close >= c.open ? '#079d89' : '#ed5665'
                return (
                  <g key={i}>
                    <line
                      x1={22 + i * 14}
                      x2={22 + i * 14}
                      y1={y(c.high)}
                      y2={y(c.low)}
                      stroke={color}
                      strokeWidth="1.1"
                    />
                    <rect
                      x={18 + i * 14}
                      width="8"
                      y={y(Math.max(c.open, c.close))}
                      height={Math.max(1.6, Math.abs(c.open - c.close) * 2.7)}
                      fill={color}
                      rx=".6"
                    />
                  </g>
                )
              })}
              <line
                x1="12"
                x2="760"
                y1={y(last.close)}
                y2={y(last.close)}
                stroke="#079d89"
                strokeDasharray="3 4"
                opacity=".6"
              />
              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map(
                (v, i) => (
                  <text
                    key={v}
                    x={20 + i * 145}
                    y="338"
                    fill="#687387"
                    fontSize="10"
                  >
                    {v}
                  </text>
                )
              )}
            </svg>
          </div>
          <div className={styles.chartFooter}>
            <span>INNOFLEX</span>
            <p>
              Illustration interactive — aucun ordre, aucune cotation en direct.
            </p>
            <span>UTC</span>
          </div>
        </div>
        <aside className={styles.watchlist}>
          <div className={styles.panelTitle}>
            <List size={17} />
            <h3>Liste d’observation</h3>
          </div>
          <div className={styles.listLabel}>
            <span>Actif</span>
            <span>Aperçu</span>
          </div>
          {instruments.map((item, i) => (
            <button
              key={item.symbol}
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
            >
              <span className={styles.assetIcon}>{item.short}</span>
              <span>
                <strong>{item.symbol}</strong>
                <small>{item.name.split(' / ')[0]}</small>
              </span>
              <svg viewBox="0 0 60 24" aria-hidden="true">
                <polyline
                  points={`0,18 8,16 14,20 22,${8 + i * 3} 30,12 38,7 45,10 52,4 60,6`}
                  fill="none"
                  stroke={i === 1 ? '#ed5665' : '#079d89'}
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          ))}
          <div className={styles.session}>
            <span>MON PLAN DE SÉANCE</span>
            <h3>Observer. Puis décider.</h3>
            <p>
              <Check size={14} /> Définir mon scénario
            </p>
            <p>
              <Check size={14} /> Fixer mes limites
            </p>
            <p>
              <span className={styles.emptyCheck} /> Documenter ma décision
            </p>
            <Link href="/trading-journal">
              Préparer ma séance <ArrowUpRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
