import Link from 'next/link'
import { ProductPreview } from './product-preview'
import styles from './product-landing.module.css'

export function ProductLanding() {
  return (
    <div className={styles.landing}>
      <section className={styles.introduction} aria-labelledby="product-title">
        <div>
          <p className={styles.productName}>L’ASSISTANT PERSONNEL INNOFLEX</p>
          <h1 id="product-title">
            Un e-mail à écrire.
            <br />
            Une semaine à organiser.
            <br />
            Un sujet à comprendre.
          </h1>
        </div>
        <div className={styles.introAside}>
          <p>
            Vous apportez le contexte.
            <br />
            INNOFLEX vous aide à trouver une formulation, un plan ou une
            explication qui vous sert.
          </p>
          <Link href="/signup" className={styles.primary}>
            Créer mon espace <span aria-hidden="true">→</span>
          </Link>
          <span className={styles.registrationNote}>
            L’inscription ne demande pas de carte bancaire.
          </span>
          <a className={styles.exploreLink} href="#apercu">
            Regarder un exemple ↓
          </a>
        </div>
      </section>
      <section
        id="apercu"
        className={styles.previewSection}
        aria-label="Aperçu du fonctionnement"
      >
        <ProductPreview />
        <div className={styles.previewFootnote}>
          <p>
            <strong>À essayer ici :</strong> choisissez un besoin, puis comparez
            la demande et une proposition.
          </p>
          <span>Exemples préparés · pas de génération IA en direct</span>
        </div>
      </section>
      <section
        id="usages"
        className={styles.useSection}
        aria-labelledby="uses-title"
      >
        <div className={styles.sectionHeading}>
          <span>LES USAGES</span>
          <h2 id="uses-title">
            Des choses précises,
            <br />
            que vous faites déjà.
          </h2>
        </div>
        <div className={styles.useRows}>
          <article>
            <h3>Écrire un message</h3>
            <p>
              Une réponse à un client, une relance ou un message difficile à
              formuler.
            </p>
            <span>Un brouillon à relire et adapter.</span>
          </article>
          <article>
            <h3>Préparer sa semaine</h3>
            <p>
              Des tâches en vrac, des échéances et un temps limité pour tout
              faire.
            </p>
            <span>Des priorités et un plan de travail.</span>
          </article>
          <article>
            <h3>Comprendre un sujet</h3>
            <p>
              Un concept nouveau, un texte compliqué ou une question à
              approfondir.
            </p>
            <span>Une explication avec des exemples.</span>
          </article>
        </div>
      </section>
      <section
        id="fonctionnement"
        className={styles.practical}
        aria-labelledby="practical-title"
      >
        <div className={styles.practicalIntro}>
          <span>PRISE EN MAIN</span>
          <h2 id="practical-title">
            Pas besoin de parler
            <br />
            comme une machine.
          </h2>
          <p>
            Une demande ordinaire suffit. Ajoutez ce qui compte : à qui vous
            écrivez, ce que vous connaissez déjà ou le temps dont vous disposez.
          </p>
        </div>
        <div className={styles.requestExample}>
          <span>UNE DEMANDE AVEC DU CONTEXTE</span>
          <blockquote>
            « Je dois répondre à un client qui attend sa livraison. Le colis
            arrive jeudi. Je veux m’excuser, sans en faire trop. »
          </blockquote>
          <p>
            Vous relisez la proposition, vous ajustez le ton, vous décidez de la
            suite. L’assistant n’envoie pas le message à votre place.
          </p>
        </div>
      </section>
      <section
        id="confiance"
        className={styles.details}
        aria-labelledby="details-title"
      >
        <div className={styles.sectionHeading}>
          <span>AVANT DE COMMENCER</span>
          <h2 id="details-title">Ce qu’il faut savoir.</h2>
        </div>
        <div className={styles.detailList}>
          <details open>
            <summary>Où en est le service ?</summary>
            <p>
              INNOFLEX Conversational AI est en phase pilote. Vous pouvez créer
              un compte ; le chat dépend de son activation. Les offres payantes
              ne sont pas ouvertes. Les tarifs et les conditions seront
              présentés avant toute souscription.
            </p>
          </details>
          <details>
            <summary>Que deviennent mes conversations ?</summary>
            <p>
              Les conversations sont enregistrées dans votre historique,
              accessible après connexion. Le partage nécessite une action de
              votre part. Lorsqu’un modèle IA est activé, les messages lui sont
              transmis pour produire la réponse. Ne saisissez pas de mots de
              passe, clés secrètes ou données sensibles.
            </p>
          </details>
          <details>
            <summary>Puis-je me fier à chaque réponse ?</summary>
            <p>
              Une réponse IA peut être inexacte. Vérifiez les faits importants
              et demandez conseil à un professionnel pour les décisions qui le
              nécessitent. Une proposition est un point de travail, pas une
              garantie de résultat.
            </p>
          </details>
          <details>
            <summary>À qui puis-je poser mes questions ?</summary>
            <p>
              Le service est développé par INNOFLEX ÉQUIPE. Pour une question,
              un retour sur le pilote ou une demande concernant vos données :{' '}
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
          <Link href="/" className={styles.wordmark}>
            innoflex<span>.</span>
          </Link>
          <p>Conversational AI · Un produit INNOFLEX ÉQUIPE</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/login">Connexion</Link>
          <Link href="/signup">Inscription</Link>
          <a href="mailto:dimitry.d@innoflexequipe.com">Contact</a>
        </div>
        <small>© {new Date().getFullYear()} INNOFLEX ÉQUIPE</small>
      </footer>
    </div>
  )
}
