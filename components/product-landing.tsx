import Link from 'next/link'
import styles from './product-landing.module.css'

const uses = [
  {
    number: '01',
    title: 'Trouver les mots justes',
    description:
      'Préparez un e-mail, reformulez une idée ou donnez une structure à votre prochain document.',
    example: '« Aide-moi à rédiger une réponse claire à ce client. »',
    icon: '↗'
  },
  {
    number: '02',
    title: 'Y voir plus clair',
    description:
      'Décomposez un sujet, explorez plusieurs pistes et posez les bonnes questions.',
    example: '« Explique-moi ce sujet avec un exemple concret. »',
    icon: '◎'
  },
  {
    number: '03',
    title: 'Passer à la prochaine étape',
    description:
      'Transformez une liste d’idées en priorités et préparez un plan adapté à vos contraintes.',
    example: '« Aide-moi à organiser mes priorités de la semaine. »',
    icon: '☷'
  }
]

export function ProductLanding() {
  return (
    <div className={styles.landing}>
      <section className={styles.hero} aria-labelledby="product-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <span /> INNOFLEX CONVERSATIONAL AI
          </span>
          <h1 id="product-title">
            Vos idées méritent
            <br />
            une <em>suite.</em>
          </h1>
          <p className={styles.intro}>
            Un assistant personnel pour écrire avec clarté, comprendre plus vite
            et avancer avec un plan.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/signup">
              Créer mon espace <span aria-hidden="true">↗</span>
            </Link>
            <a className={styles.secondary} href="#usages">
              Explorer les usages <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className={styles.smallPrint}>
            Pilote en préparation · Aucune carte demandée à l’inscription.
          </p>
          <div className={styles.heroNote}>
            <span className={styles.noteIcon} aria-hidden="true">
              i
            </span>
            <p>
              Le service évolue avec soin. La disponibilité du chat IA dépend de
              son activation ; les offres payantes ne sont pas encore ouvertes.
            </p>
          </div>
        </div>
        <div className={styles.previewWrap}>
          <div
            className={styles.preview}
            aria-label="Exemple illustratif de conversation, pas une réponse générée en direct"
          >
            <div className={styles.previewTop}>
              <span className={styles.miniBrand}>
                i<span>f</span>
              </span>
              <div>
                <strong>Votre espace de réflexion</strong>
                <span>Une idée. Une conversation. Un prochain pas.</span>
              </div>
              <span className={styles.previewDot} />
            </div>
            <div className={styles.previewBody}>
              <span className={styles.dateLabel}>
                UN PEU DE CLARTÉ POUR VOTRE JOURNÉE
              </span>
              <div className={styles.userBubble}>
                J’ai plusieurs idées pour mon projet, mais je ne sais pas par où
                commencer.
              </div>
              <div className={styles.assistantLabel}>
                <span className={styles.spark} aria-hidden="true">
                  ✳
                </span>{' '}
                INNOFLEX
              </div>
              <p className={styles.answer}>
                Commençons par rendre la prochaine étape plus simple.
              </p>
              <div className={styles.plan}>
                <div>
                  <span>1</span>
                  <p>
                    <strong>Clarifier l’objectif</strong>Quel résultat
                    voulez-vous obtenir en premier ?
                  </p>
                </div>
                <div>
                  <span>2</span>
                  <p>
                    <strong>Choisir une priorité</strong>Une action utile, à
                    votre portée aujourd’hui.
                  </p>
                </div>
                <div>
                  <span>3</span>
                  <p>
                    <strong>Construire votre plan</strong>Des étapes concrètes,
                    ajustées à vos contraintes.
                  </p>
                </div>
              </div>
              <div className={styles.exampleInput}>
                <span>Et si on commençait par votre objectif ?</span>
                <span aria-hidden="true">↑</span>
              </div>
              <p className={styles.exampleCaption}>
                Aperçu illustratif · aucune requête IA en direct
              </p>
            </div>
          </div>
          <div className={styles.floatingNote}>
            <span aria-hidden="true">↗</span>
            <div>
              Moins de dispersion.
              <br />
              <strong>Plus de direction.</strong>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.principles}>
        <span>UNE CONVERSATION, PLUSIEURS POSSIBILITÉS</span>
        <p>
          Rédiger <b>·</b> Comprendre <b>·</b> Organiser <b>·</b> Décider
        </p>
      </div>
      <section
        id="usages"
        className={styles.section}
        aria-labelledby="uses-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>À VOTRE RYTHME</span>
            <h2 id="uses-title">
              Un point de départ pour
              <br />
              ce qui compte aujourd’hui.
            </h2>
          </div>
          <p>
            Pas besoin d’un prompt parfait.
            <br />
            Commencez avec ce que vous avez en tête.
          </p>
        </div>
        <div className={styles.useGrid}>
          {uses.map(use => (
            <article key={use.number} className={styles.useCard}>
              <div className={styles.cardTop}>
                <span>{use.number}</span>
                <span aria-hidden="true">{use.icon}</span>
              </div>
              <h3>{use.title}</h3>
              <p>{use.description}</p>
              <blockquote>{use.example}</blockquote>
            </article>
          ))}
        </div>
      </section>
      <section
        id="fonctionnement"
        className={styles.workflow}
        aria-labelledby="workflow-title"
      >
        <div>
          <span className={styles.kicker}>SIMPLE, DÈS LE DÉPART</span>
          <h2 id="workflow-title">
            Votre espace.
            <br />
            Votre façon d’avancer.
          </h2>
          <p>
            Un compte pour retrouver vos conversations et reprendre le fil de
            vos idées.
          </p>
          <Link href="/signup" className={styles.textLink}>
            Préparer mon espace <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Créez votre compte</h3>
              <p>
                Votre adresse e-mail et un mot de passe. Aucune carte bancaire à
                cette étape.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Posez votre question</h3>
              <p>
                Une fois le chat activé, décrivez votre besoin et précisez le
                contexte.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Gardez votre jugement</h3>
              <p>
                Affinez la réponse et vérifiez les informations importantes
                avant de les utiliser.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section
        id="confiance"
        className={styles.section}
        aria-labelledby="trust-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>
              LA CONFIANCE COMMENCE PAR LA CLARTÉ
            </span>
            <h2 id="trust-title">
              Savoir où vous mettez
              <br />
              vos idées.
            </h2>
          </div>
          <a
            href="mailto:dimitry.d@innoflexequipe.com"
            className={styles.contact}
          >
            Une question ? Écrivez-nous ↗
          </a>
        </div>
        <div className={styles.trustGrid}>
          <article>
            <span aria-hidden="true">↳</span>
            <h3>Des conversations liées à votre compte</h3>
            <p>
              Votre historique personnel est accessible après connexion. Le
              partage d’une conversation nécessite une action de votre part.
            </p>
          </article>
          <article>
            <span aria-hidden="true">○</span>
            <h3>Un lancement transparent</h3>
            <p>
              Le produit est en phase pilote. Les offres, tarifs et conditions
              de souscription seront présentés avant toute ouverture
              commerciale.
            </p>
          </article>
          <article>
            <span aria-hidden="true">↗</span>
            <h3>Un contact identifié</h3>
            <p>
              INNOFLEX ÉQUIPE porte le développement du service. Pour vos
              questions ou demandes concernant vos données :{' '}
              <a href="mailto:dimitry.d@innoflexequipe.com">
                dimitry.d@innoflexequipe.com
              </a>
              .
            </p>
          </article>
        </div>
        <p className={styles.dataNote}>
          Les messages soumis à l’assistant peuvent être transmis au fournisseur
          IA pour produire une réponse. Évitez de partager des secrets ou des
          informations sensibles. L’IA peut se tromper et ne remplace pas un
          professionnel qualifié.
        </p>
      </section>
      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}>
          innoflex<span> / conversational ai</span>
        </Link>
        <p>Une idée plus claire. Un prochain pas.</p>
        <div>
          <Link href="/login">Connexion</Link>
          <a href="#confiance">Transparence</a>
          <a href="mailto:dimitry.d@innoflexequipe.com">Contact</a>
        </div>
        <small>© {new Date().getFullYear()} INNOFLEX ÉQUIPE</small>
      </footer>
    </div>
  )
}
