'use client'

import { useId } from 'react'
import { realizedSeries, type Trade } from '@/lib/trading/review'
import styles from './trading-performance.module.css'

export function TradingPerformance({
  trades,
  currency
}: {
  trades: Trade[]
  currency: string
}) {
  const title = useId()
  const series = realizedSeries(trades)
  const format = (value: number) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(
      value / 100
    )
  if (!series.length)
    return (
      <section className={styles.empty}>
        <h3>Cumul des résultats nets</h3>
        <p>
          Ajoutez une opération clôturée avec un résultat pour afficher la
          courbe.
        </p>
      </section>
    )
  const values = [0, ...series.map(p => p.cents)]
  const min = Math.min(...values),
    max = Math.max(...values)
  const span = max - min || 100
  const y = (value: number) => 155 - ((value - min) / span) * 120
  const points = [{ date: series[0].date, cents: 0 }, ...series]
  const x = (index: number) => 28 + (index * 724) / (points.length - 1)
  return (
    <figure className={styles.chart}>
      <figcaption>
        <div>
          <span>JOURNAL / RÉSULTATS NETS RENSEIGNÉS</span>
          <h3>Cumul des résultats nets</h3>
        </div>
        <strong>{format(series[series.length - 1].cents)}</strong>
      </figcaption>
      <svg viewBox="0 0 800 190" role="img" aria-labelledby={title}>
        <title id={title}>
          {series.length} opération(s) clôturée(s), cumul final{' '}
          {format(series[series.length - 1].cents)}. Ordre des dates d’opération
          saisies.
        </title>
        {[35, 95, 155].map(line => (
          <line
            key={line}
            x1="28"
            x2="752"
            y1={line}
            y2={line}
            stroke="#dbe3f0"
            strokeDasharray="3 5"
          />
        ))}
        <line x1="28" x2="752" y1={y(0)} y2={y(0)} stroke="#8293ae" />
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.cents)}`).join(' ')}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={x(points.length - 1)}
          cy={y(points[points.length - 1].cents)}
          r="4"
          fill="#2563eb"
        />
        <text x="28" y="180" fontSize="11" fill="#52627a">
          {series[0].date}
        </text>
        <text x="752" y="180" textAnchor="end" fontSize="11" fill="#52627a">
          {series[series.length - 1].date}
        </text>
      </svg>
      <p>
        Somme des montants nets déclarés, classés par date d’opération. Base
        zéro ; ce cumul ne représente pas la valeur du compte ni un rendement de
        portefeuille.
      </p>
    </figure>
  )
}
