import type { ReactNode } from 'react'
import styles from './auth-shell.module.css'

export function AuthShell({
  children,
  label = 'Votre compte INNOFLEX'
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <section className={styles.page} aria-label={label}>
      <aside className={styles.story}>
        <p className={styles.eyebrow}>TRADING & INVESTISSEMENT</p>
        <h2>
          Vos décisions.
          <br />
          Leur contexte.
          <br />
          <span>Votre progression.</span>
        </h2>
        <p className={styles.description}>
          Reprenez votre travail là où vous l’avez laissé. Un journal pour
          garder le fil de votre pratique.
        </p>
        <ol className={styles.steps}>
          <li>
            <span>01</span>
            <div>
              <strong>Préparer votre séance</strong>
              <p>Votre méthode, vos limites et vos conditions d’arrêt.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Documenter vos opérations</strong>
              <p>Les décisions, les observations et les résultats saisis.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Relire votre pratique</strong>
              <p>Retrouvez vos cycles et revenez sur les écarts au plan.</p>
            </div>
          </li>
        </ol>
        <p className={styles.note}>
          INNOFLEX ÉQUIPE · Accès pilote
          <br />
          Aucun paiement demandé pour créer votre espace.
        </p>
      </aside>
      <div className={styles.formArea}>{children}</div>
    </section>
  )
}
