import Link from 'next/link'
import { BrandLockup } from './brand-lockup'
import { ProductPreview } from './product-preview'
import styles from './product-landing.module.css'

export function ProductLanding() {
  return (
    <div className={styles.landing}>
      <section className={styles.introduction} aria-labelledby="product-title">
        <div>
          <p className={styles.productName}>INNOFLEX SI / JOURNAL DE TRADING</p>
          <h1 id="product-title">
            Préparez vos séances.
            <br />
            Documentez vos décisions.
            <br />
            Prenez du recul.
          </h1>
        </div>
        <div className={styles.introAside}>
          <p>
            Votre plan, vos opérations et vos revues réunis dans un espace de
            travail. Pour les traders autonomes qui veulent garder une trace
            précise de leur pratique.
          </p>
          <Link href="/trading-journal" className={styles.primary}>
            Ouvrir le journal <span aria-hidden="true">↗</span>
          </Link>
          <span className={styles.registrationNote}>
            Accès pilote · aucun paiement demandé.
            <br />
            Un compte permet d’enregistrer et de retrouver vos cycles.
          </span>
          <a className={styles.exploreLink} href="#apercu">
            Explorer une séance de démonstration ↓
          </a>
        </div>
      </section>
      <section
        id="apercu"
        className={styles.previewSection}
        aria-label="Démonstration du journal"
      >
        <ProductPreview />
        <div className={styles.previewFootnote}>
          <p>
            <strong>Parcourez les trois étapes.</strong> Les chiffres et
            observations de cet aperçu sont fictifs.
          </p>
          <span>Aucun cours de marché en direct</span>
        </div>
      </section>
      <section
        id="usages"
        className={styles.useSection}
        aria-labelledby="uses-title"
      >
        <div className={styles.sectionHeading}>
          <span>VOTRE PRATIQUE, DANS SON CONTEXTE</span>
          <h2 id="uses-title">
            Une trace avant,
            <br />
            pendant et après.
          </h2>
        </div>
        <div className={styles.useRows}>
          <article>
            <h3>01 / Préparer</h3>
            <p>
              Écrivez votre méthode, vos confirmations et vos conditions d’arrêt
              avant la séance.
            </p>
            <span>Votre propre plan comme point de référence.</span>
          </article>
          <article>
            <h3>02 / Documenter</h3>
            <p>
              Consignez le sens du trade, le contexte, votre état personnel et
              le résultat net après frais.
            </p>
            <span>Le réel et le backtest restent séparés.</span>
          </article>
          <article>
            <h3>03 / Revoir</h3>
            <p>
              Retrouvez les écarts déclarés au plan et les leçons de la semaine.
              Revenez sur un cycle précédent sans l’écraser.
            </p>
            <span>Des calculs lisibles, des observations conservées.</span>
          </article>
        </div>
      </section>
      <section
        id="fonctionnement"
        className={styles.practical}
        aria-labelledby="practical-title"
      >
        <div className={styles.practicalIntro}>
          <span>UN JOURNAL QUE VOUS GARDEZ</span>
          <h2 id="practical-title">
            Vos cycles restent
            <br />à portée de main.
          </h2>
          <p>
            Chaque cycle possède son plan et ses opérations. Enregistrez-le sur
            votre compte, retrouvez-le après connexion ou emportez une copie
            JSON.
          </p>
        </div>
        <div className={styles.requestExample}>
          <span>DU PREMIER BROUILLON À LA REVUE</span>
          <blockquote>
            Créer un cycle.
            <br />
            Consigner la séance.
            <br />
            Relire les décisions.
          </blockquote>
          <p>
            La sauvegarde est manuelle et son état est visible. Le chargement
            d’un cycle demande confirmation avant de remplacer le brouillon
            ouvert.
          </p>
          <Link href="/trading-journal" className={styles.exploreLink}>
            Essayer avec votre premier cycle →
          </Link>
        </div>
      </section>
      <section
        id="confiance"
        className={styles.details}
        aria-labelledby="details-title"
      >
        <div className={styles.sectionHeading}>
          <span>AVANT DE COMMENCER</span>
          <h2 id="details-title">Un périmètre clair.</h2>
        </div>
        <div className={styles.detailList}>
          <details open>
            <summary>Qu’est-ce qui est disponible aujourd’hui ?</summary>
            <p>
              Le plan, le journal, la modification et la clôture des opérations,
              les revues par cycle ou sur sept jours, les cycles indépendants et
              l’import/export JSON. Le service est en phase pilote ; les
              abonnements ne sont pas encore ouverts.
            </p>
          </details>
          <details>
            <summary>Comment les résultats sont-ils calculés ?</summary>
            <p>
              Le total net additionne les montants saisis pour les opérations
              clôturées et renseignées, dans la devise du cycle. Les positions
              ouvertes et les montants inconnus sont exclus. Le respect du plan
              repose sur votre propre évaluation. Ces indicateurs ne constituent
              pas un rendement de portefeuille.
            </p>
          </details>
          <details>
            <summary>Où sont enregistrées mes données ?</summary>
            <p>
              Les cycles enregistrés sont associés à votre compte et à
              l’environnement utilisé. Un brouillon non enregistré reste dans
              l’onglet et disparaît au rechargement. Vous pouvez exporter une
              copie JSON. Les fonctions du journal ne transmettent pas vos
              saisies à un modèle IA.
            </p>
          </details>
          <details>
            <summary>Le produit donne-t-il des signaux de trading ?</summary>
            <p>
              Le journal sert à organiser et à revoir vos propres décisions. Il
              ne fournit pas de signaux d’achat ou de vente, n’exécute aucun
              ordre et n’intègre pas de flux de marché en direct.
            </p>
          </details>
          <details>
            <summary>Qui développe le service ?</summary>
            <p>
              INNOFLEX ÉQUIPE. Pour un retour sur le pilote ou une question sur
              vos données :{' '}
              <a href="mailto:dimitry.d@innoflexequipe.com">
                dimitry.d@innoflexequipe.com
              </a>
              .
            </p>
          </details>
        </div>
      </section>
      <footer className={styles.footer}>
        <div>
          <Link href="/presentation" aria-label="INNOFLEX SI — Présentation">
            <BrandLockup />
          </Link>
          <p>Un produit INNOFLEX ÉQUIPE</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/trading-journal">Le journal</Link>
          <Link href="/login?next=/trading-journal">Connexion</Link>
          <a href="mailto:dimitry.d@innoflexequipe.com">Contact</a>
        </div>
        <small>© {new Date().getFullYear()} INNOFLEX ÉQUIPE</small>
      </footer>
    </div>
  )
}
