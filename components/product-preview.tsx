'use client'

import { useState } from 'react'
import Link from 'next/link'
import { reviewTrades, type Trade } from '@/lib/trading/review'
import styles from './product-landing.module.css'

const sample: Trade[] = [
  {
    id: 'a',
    date: '2026-11-02',
    asset: 'EXEMPLE A',
    mode: 'Backtest',
    status: 'Clôturée',
    pnl: -15000,
    lesson: 'Entrée avant la confirmation prévue.',
    planFollowed: 'Non'
  },
  {
    id: 'b',
    date: '2026-11-03',
    asset: 'EXEMPLE B',
    mode: 'Backtest',
    status: 'Clôturée',
    pnl: 30000,
    lesson: 'Conditions du plan documentées avant l’entrée.',
    planFollowed: 'Oui'
  },
  {
    id: 'c',
    date: '2026-11-04',
    asset: 'EXEMPLE C',
    mode: 'Backtest',
    status: 'Clôturée',
    pnl: 0,
    lesson: 'Résultat nul après frais.',
    planFollowed: 'Oui'
  },
  {
    id: 'd',
    date: '2026-11-05',
    asset: 'EXEMPLE D',
    mode: 'Backtest',
    status: 'Ouverte',
    pnl: null,
    lesson: ''
  }
]
const stages = ['Préparer la séance', 'Tenir le journal', 'Revoir la semaine']
const report = reviewTrades(sample)
const money = (value: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(
    value / 100
  )

export function ProductPreview() {
  const [stage, setStage] = useState(1)
  return (
    <div className={styles.workspace}>
      <div className={styles.workspaceToolbar}>
        <span className={styles.workspaceTitle}>
          INNOFLEX Trading & Investissement <span>/</span> Cycle de démonstration
        </span>
        <span className={styles.exampleBadge}>DONNÉES FICTIVES · CAD</span>
      </div>
      <div className={styles.workspaceBody}>
        <div className={styles.workspaceRail}>
          <span className={styles.railTitle}>LE FIL DE VOTRE SÉANCE</span>
          <div className={styles.scenarioButtons}>
            {stages.map((name, index) => (
              <button
                key={name}
                aria-pressed={stage === index}
                onClick={() => setStage(index)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {name}
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <p>
            Cet aperçu utilise des exemples préparés. Vos propres opérations
            restent dans votre journal.
          </p>
          <Link href="/trading-journal" className={styles.exploreLink}>
            Ouvrir mon espace ↗
          </Link>
        </div>
        <div className={styles.document}>
          <div className={styles.documentHeading}>
            <div>
              <span>BACKTEST / CYCLE 01</span>
              <h2>
                {stage === 0
                  ? 'Un plan explicite avant la séance.'
                  : stage === 1
                    ? 'Les décisions, avec leur contexte.'
                    : 'Une semaine, relue avec méthode.'}
              </h2>
            </div>
            <span className={styles.documentType}>DÉMONSTRATION</span>
          </div>
          <div className={styles.demoContent} aria-live="polite">
            {stage === 0 ? (
              <div className={styles.planPreview}>
                <section>
                  <span>CONFIRMATIONS ATTENDUES</span>
                  <p>
                    Noter les conditions prévues par ma méthode avant toute
                    entrée.
                  </p>
                </section>
                <section>
                  <span>CONDITIONS D’ARRÊT</span>
                  <p>
                    Définir mes limites de séance et les situations où je
                    préfère attendre.
                  </p>
                </section>
                <section>
                  <span>POINT DE REVUE</span>
                  <p>
                    Comparer mes décisions aux règles écrites avant la séance.
                  </p>
                </section>
              </div>
            ) : null}
            {stage === 1 ? (
              <div className={styles.demoTableWrap}>
                <table className={styles.demoTable}>
                  <caption>
                    Quatre opérations fictives · montants nets saisis
                  </caption>
                  <thead>
                    <tr>
                      <th>Opération</th>
                      <th>Plan</th>
                      <th>Résultat net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map(t => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.asset}</strong>
                          <small>
                            {t.date} · {t.status}
                          </small>
                        </td>
                        <td>
                          <span
                            className={
                              t.planFollowed === 'Non'
                                ? styles.deviation
                                : styles.neutral
                            }
                          >
                            {t.planFollowed === 'Non'
                              ? 'Écart déclaré'
                              : t.planFollowed === 'Oui'
                                ? 'Respecté'
                                : 'À évaluer'}
                          </span>
                        </td>
                        <td
                          className={
                            t.pnl !== null && t.pnl > 0
                              ? styles.positive
                              : t.pnl !== null && t.pnl < 0
                                ? styles.negative
                                : undefined
                          }
                        >
                          {t.pnl === null ? 'Non réalisé' : money(t.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {stage === 2 ? (
              <>
                <div className={styles.reviewMetrics}>
                  <article>
                    <span>Total net réalisé</span>
                    <strong>{money(report.netCents!)}</strong>
                    <small>{report.closed} clôturées renseignées</small>
                  </article>
                  <article>
                    <span>Écart au plan</span>
                    <strong>
                      {report.planDeviations} / {report.planDocumented}
                    </strong>
                    <small>opérations évaluées</small>
                  </article>
                </div>
                <div className={styles.reviewNote}>
                  <span>À REPRENDRE DANS LA PROCHAINE SÉANCE</span>
                  <p>{sample[0].lesson}</p>
                  <small>
                    Observation saisie dans l’exemple A. Aucune interprétation
                    IA.
                  </small>
                </div>
              </>
            ) : null}
          </div>
          <div className={styles.editorNote}>
            <span aria-hidden="true">↳</span>
            <p>
              {stage === 0
                ? 'Le plan est défini par le trader. Aucune allocation ni limite de risque n’est recommandée par cet aperçu.'
                : stage === 1
                  ? 'Une position ouverte reste distincte des résultats réalisés. Un montant inconnu ne devient pas zéro.'
                  : 'Le total présenté est une somme monétaire, pas un rendement de portefeuille. L’exemple ne préjuge d’aucun résultat futur.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
