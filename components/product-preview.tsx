'use client'

import { useState } from 'react'
import styles from './product-landing.module.css'

const examples = [
  {
    id: 'message',
    name: 'Écrire un message',
    category: 'RÉDACTION',
    title: 'Répondre à un client',
    context:
      'Le colis de mon client est en retard. Il sera livré jeudi. Je veux lui répondre avec un ton simple et professionnel.',
    draft:
      'Bonjour, la livraison a pris du retard. Votre colis devrait arriver jeudi. Désolé pour le délai.',
    result:
      'Bonjour,\n\nJe vous présente mes excuses pour le retard de livraison. Votre colis est maintenant prévu pour jeudi.\n\nMerci de votre patience. Je reste disponible si vous avez une question.\n\nBonne journée,',
    note: 'Une date précise, des excuses simples et une ouverture pour le client.'
  },
  {
    id: 'planning',
    name: 'Organiser ma semaine',
    category: 'ORGANISATION',
    title: 'Choisir les premières actions',
    context:
      'Cette semaine, je dois envoyer un devis avant mardi, préparer une présentation pour vendredi et ranger mes dossiers. J’ai deux heures disponibles par jour.',
    draft:
      'Envoyer le devis. Faire la présentation. Ranger les dossiers. Répondre aux messages.',
    result:
      'Lundi — Finaliser le devis et l’envoyer.\nMardi — Définir le plan de la présentation.\nMercredi — Préparer les diapositives principales.\nJeudi — Relire et répéter la présentation.\nVendredi — Présenter, puis ranger les dossiers.\n\nChaque jour : réserver un court créneau pour les messages et garder une marge pour les imprévus.',
    note: 'L’échéance la plus proche passe en premier. Le rangement attend que la présentation soit prête.'
  },
  {
    id: 'explanation',
    name: 'Comprendre un sujet',
    category: 'EXPLICATION',
    title: 'Comprendre une API',
    context:
      'Je découvre le développement web. Explique-moi ce qu’est une API, sans jargon, avec un exemple que je peux visualiser.',
    draft:
      'Une API est une interface de programmation qui permet à deux logiciels de communiquer.',
    result:
      'Une API est une façon organisée de demander quelque chose à un logiciel.\n\nImaginez une application météo. Elle demande la température de Montréal à un service météo. Le service lui répond avec une valeur, par exemple 12 °C. L’application affiche ensuite cette information.\n\nL’API définit comment poser la question et sous quelle forme la réponse revient.',
    note: 'Une définition courte, un exemple et la distinction entre le service et l’application.'
  }
] as const

export function ProductPreview() {
  const [selected, setSelected] = useState(0)
  const [view, setView] = useState<'draft' | 'result'>('result')
  const example = examples[selected]
  return (
    <div className={styles.workspace}>
      <div className={styles.workspaceToolbar}>
        <span className={styles.workspaceTitle}>
          INNOFLEX <span>/</span> Espace de travail
        </span>
        <span className={styles.exampleBadge}>EXEMPLE INTERACTIF</span>
      </div>
      <div className={styles.workspaceBody}>
        <div className={styles.workspaceRail}>
          <span className={styles.railTitle}>QUE VOULEZ-VOUS PRÉPARER ?</span>
          <div className={styles.scenarioButtons}>
            {examples.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === index}
                onClick={() => {
                  setSelected(index)
                  setView('result')
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {item.name}
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          <p>
            Ces exemples sont écrits à l’avance. Aucune donnée n’est envoyée à
            un service IA.
          </p>
        </div>
        <div className={styles.document}>
          <div className={styles.documentHeading}>
            <div>
              <span>{example.category}</span>
              <h2>{example.title}</h2>
            </div>
            <span className={styles.documentType}>APERÇU</span>
          </div>
          <div className={styles.context}>
            <span>LA DEMANDE</span>
            <p>{example.context}</p>
          </div>
          <div
            className={styles.documentTabs}
            aria-label="Version de l’exemple"
          >
            <button
              type="button"
              aria-pressed={view === 'draft'}
              onClick={() => setView('draft')}
            >
              Point de départ
            </button>
            <button
              type="button"
              aria-pressed={view === 'result'}
              onClick={() => setView('result')}
            >
              Proposition
            </button>
          </div>
          <div
            className={styles.documentText}
            aria-live="polite"
            aria-atomic="true"
          >
            <p>{view === 'result' ? example.result : example.draft}</p>
          </div>
          <div className={styles.editorNote}>
            <span aria-hidden="true">↳</span>
            <p>
              {view === 'result'
                ? example.note
                : 'Le point de départ est volontairement bref. Comparez-le à la proposition pour voir ce qui change.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
