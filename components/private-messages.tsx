'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  createPrivateRoom,
  joinPrivateRoom,
  listPrivateRooms,
  loadPrivateRoom,
  sendPrivateMessage,
  type PrivateRoom
} from '@/app/messages/actions'
import styles from './private-messages.module.css'

export function PrivateMessages() {
  const [rooms, setRooms] = useState<
    { id: string; name: string; joined: boolean }[]
  >([])
  const [room, setRoom] = useState<PrivateRoom | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(
    'Choisissez « Actualiser » pour retrouver vos conversations.'
  )
  const [invitation, setInvitation] = useState('')
  const [draft, setDraft] = useState('')
  const nonce = useRef('')
  async function refresh() {
    const result = await listPrivateRooms()
    if (result.ok && 'rooms' in result) setRooms(result.rooms)
    else setNotice(result.message)
  }
  async function select(id: string) {
    if (
      draft.trim() &&
      !window.confirm('Le message non envoyé sera remplacé. Continuer ?')
    )
      return
    setBusy(true)
    try {
      const result = await loadPrivateRoom(id)
      if (result.ok && 'room' in result) {
        setRoom(result.room)
        setDraft('')
        nonce.current = ''
        setNotice(
          'Conversation chargée. Les messages ne sont pas transmis à l’assistant IA.'
        )
      } else setNotice(result.message)
    } catch {
      setNotice('Connexion interrompue. Réessayez.')
    } finally {
      setBusy(false)
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('name') || '')
    setBusy(true)
    try {
      const result = await createPrivateRoom(name)
      if (result.ok && 'invitation' in result) {
        setInvitation(result.invitation)
        setNotice(
          'Conversation créée. Partagez le code uniquement avec la personne souhaitée.'
        )
        await refresh()
        form.reset()
      } else setNotice(result.message)
    } catch {
      setNotice(
        'Création non confirmée. Actualisez la liste avant de réessayer.'
      )
    } finally {
      setBusy(false)
    }
  }
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const code = String(new FormData(form).get('invitation') || '').trim()
    setBusy(true)
    try {
      const result = await joinPrivateRoom(code)
      if (result.ok) {
        await refresh()
        setNotice(
          'Invitation acceptée. Sélectionnez la conversation pour l’ouvrir.'
        )
        form.reset()
      } else setNotice(result.message)
    } catch {
      setNotice(
        'Invitation non confirmée. Actualisez la liste avant de réessayer.'
      )
    } finally {
      setBusy(false)
    }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!room) return
    const text = draft,
      id = room.id
    if (!nonce.current) nonce.current = crypto.randomUUID()
    setBusy(true)
    try {
      const result = await sendPrivateMessage(id, text, nonce.current)
      if (result.ok) {
        setDraft('')
        nonce.current = ''
        setNotice('Message envoyé.')
        const updated = await loadPrivateRoom(id)
        if (updated.ok && 'room' in updated) setRoom(updated.room)
      } else setNotice(result.message)
    } catch {
      setNotice(
        'Envoi non confirmé. Réessayez le même message ; sa référence est conservée pour éviter un doublon.'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p>TRADING & INVESTMENT / ÉCHANGES ENTRE UTILISATEURS</p>
        <h1>Messages privés</h1>
        <span>
          Deux personnes, sur invitation. Pour parler à l’assistant IA, utilisez{' '}
          <Link href="/">Assistant IA</Link>.
        </span>
      </div>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.listHeading}>
            <h2>Conversations</h2>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await refresh()
                } catch {
                  setNotice('Liste indisponible.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Actualiser
            </button>
          </div>
          <ul>
            {rooms.map(item => (
              <li key={item.id}>
                <button
                  disabled={busy}
                  aria-pressed={room?.id === item.id}
                  onClick={() => select(item.id)}
                >
                  {item.name}
                  <small>
                    {item.joined
                      ? 'Deux participants'
                      : 'Invitation en attente'}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {!rooms.length ? (
            <p className={styles.hint}>
              Aucune conversation chargée. Actualisez ou créez une invitation.
            </p>
          ) : null}
          <details>
            <summary>Inviter une personne</summary>
            <form onSubmit={create}>
              <label>
                Sujet
                <input
                  name="name"
                  maxLength={80}
                  required
                  placeholder="Ex. : Revue de séance"
                />
              </label>
              <p>
                Le code donne accès aux messages de cette conversation.
                Partagez-le uniquement avec la personne souhaitée.
              </p>
              <button disabled={busy}>Créer une invitation</button>
            </form>
          </details>
          {invitation ? (
            <div className={styles.invitation}>
              <strong>
                Code personnel · valable 24 heures · un seul usage
              </strong>
              <textarea
                readOnly
                aria-label="Code d’invitation personnel"
                value={invitation}
              />
              <p>
                Copiez ce code avant de quitter. Il ne sera plus affiché après
                rechargement.
              </p>
              <button onClick={() => setInvitation('')}>Masquer le code</button>
            </div>
          ) : null}
          <details>
            <summary>Rejoindre une conversation</summary>
            <form onSubmit={join}>
              <label>
                Code reçu
                <input
                  name="invitation"
                  maxLength={101}
                  required
                  autoComplete="off"
                />
              </label>
              <p>
                En acceptant, vos messages seront visibles par l’autre
                participant.
              </p>
              <button disabled={busy}>Accepter l’invitation</button>
            </form>
          </details>
        </aside>
        <section
          className={styles.conversation}
          aria-label="Conversation sélectionnée"
        >
          {room ? (
            <>
              <header className={styles.roomHeading}>
                <div>
                  <h2>{room.name}</h2>
                  <p>
                    {room.joined
                      ? 'Deux participants'
                      : 'En attente de la personne invitée'}
                  </p>
                </div>
                <button disabled={busy} onClick={() => select(room.id)}>
                  Actualiser les messages
                </button>
              </header>
              <ol className={styles.messages}>
                {room.messages.map(message => (
                  <li key={message.id} data-mine={message.mine}>
                    <span>
                      {message.mine ? 'Vous' : 'Partenaire'} ·{' '}
                      <time dateTime={message.at}>
                        {new Date(message.at).toLocaleString('fr-CA')}
                      </time>
                    </span>
                    <p>{message.text}</p>
                  </li>
                ))}
              </ol>
              {!room.messages.length ? (
                <p className={styles.hint}>
                  Cette conversation n’a pas encore de message.
                </p>
              ) : null}
              <form className={styles.composer} onSubmit={send}>
                <label>
                  Votre message
                  <textarea
                    value={draft}
                    disabled={busy}
                    maxLength={2000}
                    required
                    onChange={e => {
                      setDraft(e.target.value)
                      nonce.current = ''
                    }}
                    placeholder="Écrire à votre partenaire…"
                  />
                </label>
                <div>
                  <span>{draft.length} / 2 000</span>
                  <button disabled={busy || !draft.trim()}>
                    Envoyer au partenaire
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className={styles.empty}>
              <h2>Ouvrez une conversation</h2>
              <p>
                Retrouvez un échange existant ou créez une invitation. Votre
                journal et vos conversations IA restent dans leurs espaces
                respectifs.
              </p>
            </div>
          )}
          <p className={styles.retention}>
            Accès pilote : 10 conversations maximum par compte, 200 derniers
            messages conservés par conversation. Actualisation manuelle. Pas de
            pièces jointes ni de notifications e-mail. Les messages ne sont pas
            chiffrés de bout en bout.
          </p>
        </section>
      </div>
    </div>
  )
}
