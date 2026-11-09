'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  parseMoney,
  reviewTrades,
  parseCycleDraft,
  validTradeDate,
  filterReviewWeek,
  type CycleDraft,
  type Trade
} from '@/lib/trading/review'
import styles from './trading-workbench.module.css'
import { TradingPerformance } from './trading-performance'
import {
  listTradingCycles,
  loadTradingDraft,
  saveTradingDraft
} from '@/app/trading-journal/actions'

export default function TradingWorkbench() {
  const [tab, setTab] = useState('Plan')
  const [revision, setRevision] = useState(0)
  const [activeCycleId, setActiveCycleId] = useState('default')
  const [selectedCycleId, setSelectedCycleId] = useState('default')
  const [loadedCycleId, setLoadedCycleId] = useState<string | null>(null)
  const [cycles, setCycles] = useState<
    { id: string; name: string; updatedAt: string }[]
  >([])
  const [confirmNew, setConfirmNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [storageMessage, setStorageMessage] = useState(
    'Tes cycles restent séparés par compte et par environnement. Enregistrement manuel.'
  )
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null)
  const [cycle, setCycle] = useState('Mon premier cycle')
  const [mode, setMode] = useState<Trade['mode']>('Backtest')
  const [currency, setCurrency] = useState('CAD')
  const [plan, setPlan] = useState({ method: '', limits: '', avoid: '' })
  const [trades, setTrades] = useState<Trade[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Trade | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [journalMessage, setJournalMessage] = useState('')
  const [week, setWeek] = useState('')
  const [assetFilter, setAssetFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Toutes')
  const [pendingImport, setPendingImport] = useState<CycleDraft | null>(null)
  const [importMessage, setImportMessage] = useState('')
  const assetRows = assetFilter
    ? trades.filter(t => t.asset === assetFilter)
    : trades
  const reviewRows = filterReviewWeek(assetRows, week)
  const journalRows = assetRows.filter(
    t =>
      (statusFilter === 'Toutes' || t.status === statusFilter) &&
      `${t.asset} ${t.setup || ''} ${t.lesson}`
        .toLocaleLowerCase('fr')
        .includes(search.trim().toLocaleLowerCase('fr'))
  )
  const assets = Array.from(new Set(trades.map(t => t.asset))).sort()
  const journalSummary = reviewTrades(assetRows)
  const report = reviewTrades(reviewRows)
  async function saveToAccount() {
    const snapshot = JSON.stringify({
      version: 1,
      cycle,
      mode,
      currency,
      plan,
      trades
    })
    setBusy(true)
    try {
      const result = await saveTradingDraft(snapshot, revision, activeCycleId)
      setStorageMessage(result.message)
      if (result.ok && result.revision) {
        setRevision(result.revision)
        setSavedSnapshot(snapshot)
        const listing = await listTradingCycles()
        if (listing.ok) setCycles(listing.cycles)
      }
    } catch {
      setStorageMessage(
        'Connexion interrompue. Vérifie la sauvegarde en rechargeant le cycle du compte après avoir exporté ton brouillon.'
      )
    } finally {
      setBusy(false)
    }
  }
  async function loadFromAccount() {
    setBusy(true)
    setPendingImport(null)
    setLoadedRevision(null)
    setLoadedCycleId(null)
    try {
      const result = await loadTradingDraft(selectedCycleId)
      if (!result.ok) {
        setStorageMessage(result.message)
        return
      }
      if (!result.draft) {
        setStorageMessage(
          'Aucun cycle enregistré sur ce compte dans cet environnement.'
        )
        return
      }
      setPendingImport(result.draft)
      setLoadedRevision(result.revision)
      setLoadedCycleId(selectedCycleId)
      setImportMessage(
        'Cycle du compte récupéré. Confirme son chargement ci-dessous.'
      )
      setStorageMessage(
        'Cycle récupéré ; ton brouillon reste inchangé jusqu’à confirmation.'
      )
    } catch {
      setStorageMessage('Lecture indisponible. Ton brouillon reste intact.')
    } finally {
      setBusy(false)
    }
  }
  async function readImport(file: File | undefined) {
    if (!file) return
    setPendingImport(null)
    setLoadedRevision(null)
    setLoadedCycleId(null)
    try {
      if (file.size > 2_000_000)
        throw new Error('Fichier trop volumineux (2 Mo maximum).')
      setPendingImport(parseCycleDraft(await file.text()))
      setImportMessage('Fichier vérifié. Confirme le remplacement ci-dessous.')
    } catch {
      setImportMessage(
        'Import refusé : fichier invalide, incompatible ou trop volumineux. Ton brouillon est conservé.'
      )
    }
  }
  function applyImport() {
    if (!pendingImport) return
    if (loadedRevision !== null) {
      setRevision(loadedRevision)
      if (loadedCycleId) setActiveCycleId(loadedCycleId)
      setSavedSnapshot(JSON.stringify(pendingImport))
    }
    setLoadedRevision(null)
    setEditing(null)
    setFormVersion(value => value + 1)
    setCycle(pendingImport.cycle)
    setMode(pendingImport.mode)
    setCurrency(pendingImport.currency)
    setPlan(pendingImport.plan)
    setTrades(pendingImport.trades)
    setWeek('')
    setAssetFilter('')
    setSearch('')
    setStatusFilter('Toutes')
    setPendingImport(null)
    setImportMessage('Cycle importé dans cet onglet.')
    setError('')
  }
  async function refreshCycles() {
    setBusy(true)
    try {
      const result = await listTradingCycles()
      if (result.ok) {
        setCycles(result.cycles)
        setStorageMessage(
          `${result.cycles.length} cycle(s) enregistré(s). Sélectionne un cycle puis charge-le.`
        )
      } else setStorageMessage(result.message)
    } catch {
      setStorageMessage('Liste indisponible. Ton brouillon reste intact.')
    } finally {
      setBusy(false)
    }
  }
  function startNewCycle() {
    const id = crypto.randomUUID()
    setActiveCycleId(id)
    setSelectedCycleId(id)
    setRevision(0)
    setSavedSnapshot(null)
    setCycle('Nouveau cycle')
    setPlan({ method: '', limits: '', avoid: '' })
    setTrades([])
    setMode('Backtest')
    setCurrency('CAD')
    setWeek('')
    setAssetFilter('')
    setSearch('')
    setStatusFilter('Toutes')
    setTab('Plan')
    setPendingImport(null)
    setLoadedRevision(null)
    setLoadedCycleId(null)
    setConfirmNew(false)
    setError('')
    setImportMessage('')
    setStorageMessage(
      'Nouveau brouillon. Tes cycles enregistrés restent disponibles ; enregistre celui-ci pour le conserver.'
    )
  }
  const isSaved =
    savedSnapshot !== null &&
    savedSnapshot ===
      JSON.stringify({ version: 1, cycle, mode, currency, plan, trades }) &&
    editing === null
  const money = (cents: number | null) =>
    cents === null
      ? 'À renseigner'
      : new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(
          cents / 100
        )
  function addTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    if (
      !validTradeDate(values.get('date')) ||
      !String(values.get('asset') || '').trim()
    ) {
      setError('Renseigne une date valide et un actif.')
      return
    }
    const status = values.get('status') as Trade['status']
    const pnlText = String(values.get('pnl') || '').trim()
    const pnl = pnlText ? parseMoney(pnlText) : null
    if (pnlText && pnl === null) {
      setError('Indique un montant valide, avec deux décimales au maximum.')
      return
    }
    if (status === 'Ouverte' && pnlText) {
      setError('Une opération ouverte ne peut pas avoir de résultat réalisé.')
      return
    }
    const entry: Trade = {
      id: editing?.id || crypto.randomUUID(),
      date: String(values.get('date')),
      asset: String(values.get('asset')).trim(),
      mode,
      status,
      pnl,
      lesson: String(values.get('lesson')).trim(),
      direction: String(values.get('direction') || '') as Trade['direction'],
      setup: String(values.get('setup') || '').trim(),
      emotionBefore: String(values.get('emotionBefore') || '').trim(),
      emotionAfter: String(values.get('emotionAfter') || '').trim(),
      planFollowed: String(
        values.get('planFollowed') || ''
      ) as Trade['planFollowed']
    }
    setTrades(current =>
      editing
        ? current.map(row => (row.id === editing.id ? entry : row))
        : [...current, entry]
    )
    setJournalMessage(
      editing
        ? 'Opération modifiée dans le brouillon. Enregistre le cycle pour la conserver.'
        : 'Opération ajoutée au brouillon. Enregistre le cycle pour la conserver.'
    )
    setEditing(null)
    setFormVersion(value => value + 1)
    setError('')
    form.reset()
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, cycle, mode, currency, plan, trades },
            null,
            2
          )
        ],
        { type: 'application/json' }
      )
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'innoflex-cycle.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className={styles.shell}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>PRÉPARER / DOCUMENTER / APPRENDRE</p>
        <h1>Votre journal de décisions.</h1>
        <p>
          Préparez votre séance, consignez vos décisions et retrouvez les écarts
          à votre plan.
        </p>
      </div>
      <aside className={styles.notice}>
        Enregistrez votre cycle avant de quitter pour retrouver vos saisies.
        Vous pouvez aussi conserver une copie avec l’export du journal.
      </aside>
      <div className={styles.actionBar} aria-label="Cycle en cours">
        <div>
          <span>
            CYCLE EN COURS · {mode} · {currency}
          </span>
          <strong>{cycle || 'Cycle sans nom'}</strong>
          <small role="status">
            {busy
              ? 'Traitement en cours…'
              : isSaved
                ? 'Sauvegarde à jour dans cet onglet'
                : 'Modifications à enregistrer'}
          </small>
        </div>
        <button disabled={busy || editing !== null} onClick={saveToAccount}>
          {busy ? 'Traitement…' : 'Enregistrer le cycle'}
        </button>
      </div>
      <p role="status" className={styles.saveFeedback}>
        {storageMessage}
      </p>
      <details className={styles.cycleManager}>
        <summary>Mes cycles · ouvrir ou créer un cycle</summary>
        <section className={styles.panel} aria-label="Sauvegarde du cycle">
          <label>
            Cycles enregistrés
            <select
              disabled={busy || editing !== null}
              value={selectedCycleId}
              onChange={e => setSelectedCycleId(e.target.value)}
            >
              {!cycles.some(c => c.id === selectedCycleId) ? (
                <option value={selectedCycleId}>
                  {selectedCycleId === 'default'
                    ? 'Premier cycle / ancien journal'
                    : 'Brouillon actuel'}
                </option>
              ) : null}
              {cycles.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name || 'Cycle sans nom'}
                  {c.id === activeCycleId ? ' · cycle affiché' : ''}
                </option>
              ))}
            </select>
          </label>
          <p>
            La sélection prépare un chargement. « Enregistrer » sauvegarde le
            cycle actuellement affiché : {cycle || 'Cycle sans nom'}.
          </p>
          <button
            className={styles.secondary}
            disabled={busy || editing !== null}
            onClick={refreshCycles}
          >
            Actualiser mes cycles
          </button>{' '}
          <button
            className={styles.secondary}
            disabled={busy || editing !== null}
            onClick={() => setConfirmNew(true)}
          >
            Nouveau cycle
          </button>
          {confirmNew ? (
            <div role="group" aria-label="Confirmer un nouveau cycle">
              <p>
                Le brouillon affiché sera remplacé. Enregistre-le ou exporte-le
                avant de continuer. Tes cycles déjà enregistrés seront
                conservés.
              </p>
              <button
                disabled={busy || editing !== null}
                onClick={startNewCycle}
              >
                Créer un nouveau brouillon
              </button>{' '}
              <button
                className={styles.secondary}
                onClick={() => setConfirmNew(false)}
              >
                Annuler
              </button>
            </div>
          ) : null}
          <p role="status">
            {savedSnapshot !== null &&
            savedSnapshot ===
              JSON.stringify({
                version: 1,
                cycle,
                mode,
                currency,
                plan,
                trades
              }) &&
            editing === null
              ? '✓ Brouillon identique à la dernière sauvegarde chargée ou effectuée dans cet onglet.'
              : '● Brouillon non enregistré ou sauvegarde non vérifiée dans cet onglet.'}
          </p>
          <button
            className={styles.secondary}
            disabled={busy || editing !== null}
            onClick={loadFromAccount}
          >
            Retrouver mon cycle enregistré
          </button>
          <p role="status">{busy ? 'Opération en cours…' : storageMessage}</p>
          <p>
            <Link
              href="/login?next=/trading-journal"
              target="_blank"
              rel="noopener noreferrer"
            >
              Se connecter dans un nouvel onglet
            </Link>{' '}
            · Le fichier exporté reste une copie locale indépendante. Après
            connexion, reviens à cet onglet pour enregistrer ton brouillon sans
            le recharger.
          </p>
        </section>
      </details>
      <section className={styles.context} aria-label="Contexte du cycle">
        <label>
          Cycle
          <input
            maxLength={100}
            value={cycle}
            onChange={e => setCycle(e.target.value)}
          />
        </label>
        <label>
          Pratique
          <select
            disabled={trades.length > 0}
            value={mode}
            onChange={e => setMode(e.target.value as Trade['mode'])}
          >
            <option>Backtest</option>
            <option>Réel</option>
          </select>
        </label>
        <label>
          Devise
          <select
            disabled={trades.length > 0}
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            <option>CAD</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </label>
        <button
          disabled={busy || editing !== null}
          className={styles.secondary}
          onClick={download}
        >
          Exporter le brouillon
        </button>
      </section>
      <details
        className={styles.cycleManager}
        open={pendingImport ? true : undefined}
      >
        <summary>Importer un fichier ou confirmer un chargement</summary>
        <section className={styles.panel} aria-label="Reprendre un cycle">
          <label>
            Importer un cycle (JSON, 2 Mo maximum)
            <input
              type="file"
              disabled={busy || editing !== null}
              accept=".json,application/json"
              onChange={e => {
                void readImport(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <p role="status">{importMessage}</p>
          {pendingImport ? (
            <div>
              <p>
                « {pendingImport.cycle} » · {pendingImport.trades.length}{' '}
                opérations · {pendingImport.mode} · {pendingImport.currency}. Ce
                cycle remplacera le brouillon actuel. Exporte-le d’abord si tu
                souhaites le garder.
              </p>
              <button disabled={busy || editing !== null} onClick={applyImport}>
                Remplacer par ce cycle
              </button>{' '}
              <button
                className={styles.secondary}
                onClick={() => {
                  setPendingImport(null)
                  setImportMessage('Import annulé. Brouillon conservé.')
                }}
              >
                Annuler
              </button>
            </div>
          ) : null}
        </section>
      </details>
      <div className={styles.terminalToolbar} aria-label="Instruments du cycle">
        <div>
          <span className={styles.marketLabel}>ESPACE DE TRAVAIL</span>
          <strong>
            {mode} / {currency}
          </strong>
        </div>
        <label>
          Instrument
          <select
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
          >
            <option value="">Tous les instruments</option>
            {assets.map(asset => (
              <option key={asset}>{asset}</option>
            ))}
          </select>
        </label>
        <span className={styles.recordCount}>
          {assetRows.length} opération(s) · saisies manuelles
        </span>
      </div>
      <nav className={styles.tabs} aria-label="Étapes du journal">
        {['Plan', 'Journal', 'Revue'].map((name, index) => (
          <button
            key={name}
            disabled={editing !== null && name !== 'Journal'}
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => setTab(name)}
          >
            <span aria-hidden="true">
              {String(index + 1).padStart(2, '0')} /{' '}
            </span>
            {name}
          </button>
        ))}
      </nav>
      {tab === 'Plan' ? (
        <section className={styles.panel}>
          <p className={styles.eyebrow}>01 / AVANT LA SESSION</p>
          <h2>Définissez les règles de votre séance.</h2>
          <p>
            Définissez vos propres limites. Le journal ne recommande ni
            allocation ni niveau de risque.
          </p>
          {(
            [
              {
                key: 'method',
                title: 'Méthode et confirmations',
                hint: 'Quels éléments doivent être réunis avant une entrée ?'
              },
              {
                key: 'limits',
                title: 'Limites de la session',
                hint: 'Quelles règles de risque et d’arrêt souhaitez-vous respecter ?'
              },
              {
                key: 'avoid',
                title: 'Conditions pour ne pas intervenir',
                hint: 'Quels contextes ou états personnels vous conduisent à attendre ?'
              }
            ] as const
          ).map(field => (
            <label key={field.key}>
              {field.title}
              <textarea
                maxLength={4000}
                placeholder={field.hint}
                value={plan[field.key]}
                onChange={e =>
                  setPlan(current => ({
                    ...current,
                    [field.key]: e.target.value
                  }))
                }
              />
            </label>
          ))}
          <button onClick={() => setTab('Journal')}>Passer au journal →</button>
        </section>
      ) : null}
      {tab === 'Journal' ? (
        <section className={styles.panel}>
          <p className={styles.eyebrow}>
            02 / OBSERVER SANS RÉÉCRIRE L’HISTOIRE
          </p>
          <h2>
            {editing ? 'Modifier une opération' : 'Journal des opérations'}
          </h2>
          <div className={styles.sessionStrip}>
            <span>
              Réalisé <strong>{money(journalSummary.netCents)}</strong>
            </span>
            <span>
              Ouvertes <strong>{journalSummary.open}</strong>
            </span>
            <span>
              Clôturées renseignées <strong>{journalSummary.closed}</strong>
            </span>
          </div>
          <p role="status">{journalMessage}</p>
          {editing ? (
            <p>
              Valide ou annule cette modification avant de changer de page,
              d’exporter ou d’enregistrer le cycle.
            </p>
          ) : null}
          <form
            key={`${editing?.id || 'new'}-${formVersion}`}
            id="g20-operation-form"
            onSubmit={addTrade}
            className={styles.form}
          >
            <label>
              Date
              <input
                name="date"
                type="date"
                required
                defaultValue={editing?.date}
              />
            </label>
            <label>
              Actif
              <input
                name="asset"
                defaultValue={editing?.asset}
                required
                maxLength={60}
                placeholder="Ex. : EUR/USD"
              />
            </label>
            <label>
              État
              <select name="status" defaultValue={editing?.status || 'Ouverte'}>
                <option>Ouverte</option>
                <option>Clôturée</option>
              </select>
            </label>
            <label>
              Résultat net réalisé ({currency})
              <input
                name="pnl"
                defaultValue={
                  editing?.pnl == null ? '' : (editing.pnl / 100).toFixed(2)
                }
                inputMode="decimal"
                placeholder="Vide si inconnu ; 0 si nul"
              />
            </label>
            <label>
              Sens du trade
              <select name="direction" defaultValue={editing?.direction || ''}>
                <option value="">Non renseigné</option>
                <option>Long</option>
                <option>Short</option>
              </select>
            </label>
            <label>
              Respect du plan
              <select
                name="planFollowed"
                defaultValue={editing?.planFollowed || ''}
              >
                <option value="">À évaluer</option>
                <option value="Oui">Plan respecté</option>
                <option value="Non">Écart au plan</option>
              </select>
            </label>
            <label className={styles.wide}>
              Contexte et confirmations d’entrée
              <textarea
                name="setup"
                maxLength={1000}
                defaultValue={editing?.setup}
                placeholder="Pourquoi cette entrée ? Quels éléments du plan étaient présents ?"
              />
            </label>
            <label>
              État avant l’entrée
              <input
                name="emotionBefore"
                maxLength={100}
                defaultValue={editing?.emotionBefore}
                placeholder="Votre observation, avec vos mots"
              />
            </label>
            <label>
              État après l’opération
              <input
                name="emotionAfter"
                maxLength={100}
                defaultValue={editing?.emotionAfter}
                placeholder="À compléter lors de la revue"
              />
            </label>
            <label className={styles.wide}>
              Observation / leçon
              <textarea
                name="lesson"
                defaultValue={editing?.lesson}
                maxLength={4000}
                placeholder="Qu’avez-vous observé ? Avez-vous respecté votre plan ?"
              />
            </label>
            <p className={styles.wide}>
              Résultat après frais, saisi manuellement. Une opération clôturée
              sans montant reste à compléter.
            </p>
            {error ? (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            ) : null}
            <button type="submit">
              {editing ? 'Valider la modification' : 'Ajouter l’opération'}
            </button>
            {editing ? (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setEditing(null)
                  setError('')
                  setFormVersion(value => value + 1)
                }}
              >
                Annuler la modification
              </button>
            ) : null}
          </form>
          <div className={styles.journalFilters}>
            <label>
              Rechercher dans le journal
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Actif, contexte, observation…"
              />
            </label>
            <label>
              État
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option>Toutes</option>
                <option>Ouverte</option>
                <option>Clôturée</option>
              </select>
            </label>
            <span>
              {journalRows.length} / {trades.length} opération(s) affichée(s)
            </span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <caption>
                Opérations du cycle · {mode} · {currency}
              </caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Actif</th>
                  <th>État / discipline</th>
                  <th>Résultat net</th>
                  <th>Observation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {journalRows.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.asset}</td>
                    <td>
                      {t.status}
                      <br />
                      <small>
                        {t.direction || 'Sens non renseigné'} ·{' '}
                        {t.planFollowed === 'Non'
                          ? 'Écart au plan'
                          : t.planFollowed === 'Oui'
                            ? 'Plan respecté'
                            : 'Plan à évaluer'}
                      </small>
                    </td>
                    <td>
                      {t.status === 'Ouverte' ? 'Non réalisé' : money(t.pnl)}
                    </td>
                    <td>
                      {t.lesson || '—'}
                      {t.setup || t.emotionBefore || t.emotionAfter ? (
                        <details>
                          <summary>Contexte et état personnel</summary>
                          <p>{t.setup || 'Contexte non renseigné'}</p>
                          <p>
                            Avant : {t.emotionBefore || 'Non renseigné'} · Après
                            : {t.emotionAfter || 'Non renseigné'}
                          </p>
                        </details>
                      ) : null}
                    </td>
                    <td>
                      <button
                        className={styles.secondary}
                        onClick={() => {
                          setEditing(t)
                          setError('')
                          setJournalMessage(
                            'Modifie les champs ci-dessus, puis valide la modification.'
                          )
                          setFormVersion(value => value + 1)
                          document
                            .getElementById('g20-operation-form')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start'
                            })
                        }}
                        disabled={busy || editing !== null}
                        aria-label={`Modifier ${t.asset} du ${t.date}`}
                      >
                        Modifier / clôturer
                      </button>{' '}
                      <button
                        className={styles.secondary}
                        disabled={busy || editing !== null}
                        aria-label={`Supprimer ${t.asset} du ${t.date}`}
                        onClick={() =>
                          setTrades(current =>
                            current.filter(row => row.id !== t.id)
                          )
                        }
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!journalRows.length ? (
              <p>
                {trades.length
                  ? 'Aucune opération ne correspond aux filtres.'
                  : ''}
              </p>
            ) : null}
            {!trades.length ? (
              <p>
                Votre journal est prêt. Ajoutez une première opération ou
                chargez un cycle enregistré.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {tab === 'Revue' ? (
        <section className={styles.panel}>
          <p className={styles.eyebrow}>03 / REVUE DU CYCLE</p>
          <h2>{cycle || 'Cycle sans nom'}</h2>
          <label>
            Revue sur sept jours à partir du
            <input
              type="date"
              value={week}
              onChange={e => setWeek(e.target.value)}
            />
          </label>
          {week ? (
            <button className={styles.secondary} onClick={() => setWeek('')}>
              Voir tout le cycle
            </button>
          ) : null}
          <p>
            {week
              ? `Période de sept jours à partir du ${week}`
              : 'Cycle complet'}{' '}
            · {mode} · {currency} · {assetFilter || 'Tous les instruments'}. Le
            filtre utilise la date d’opération saisie, pas une date de clôture.
          </p>
          <div className={styles.metrics}>
            <article>
              <span>Résultat net réalisé</span>
              <strong>{money(report.netCents)}</strong>
            </article>
            <article>
              <span>Opérations clôturées renseignées</span>
              <strong>{report.closed}</strong>
            </article>
            <article>
              <span>Part des opérations gagnantes</span>
              <strong>
                {report.winRate === null
                  ? 'Non disponible'
                  : `${Math.round(report.winRate * 100)} %`}
              </strong>
            </article>
          </div>
          <p>
            {report.wins} gagnante(s) · {report.losses} perdante(s) ·{' '}
            {report.flat} à résultat nul · {report.open} ouverte(s) ·{' '}
            {report.incomplete} à compléter.
          </p>
          <p>
            Seules les opérations clôturées avec un montant renseigné entrent
            dans les calculs. Les résultats nuls comptent parmi les clôturées.
            Ce total monétaire n’est pas un rendement de portefeuille.
          </p>
          <TradingPerformance trades={reviewRows} currency={currency} />
          <h3>Discipline de la période</h3>
          <p>
            {report.planDocumented
              ? `${report.planDeviations} écart(s) au plan sur ${report.planDocumented} opération(s) évaluée(s).`
              : 'Le respect du plan n’est pas encore renseigné pour cette période.'}{' '}
            Cette mesure repose sur vos déclarations, pour les opérations
            ouvertes et clôturées de la période.
          </p>
          {reviewRows.filter(t => t.planFollowed === 'Non').length ? (
            <ul>
              {reviewRows
                .filter(t => t.planFollowed === 'Non')
                .map(t => (
                  <li key={t.id}>
                    <strong>
                      {t.date} · {t.asset}
                    </strong>{' '}
                    —{' '}
                    {t.lesson || 'Ajoutez une leçon pour documenter cet écart.'}
                  </li>
                ))}
            </ul>
          ) : null}
          <h3>À relire avant votre prochaine séance</h3>
          {reviewRows.filter(t => t.lesson).length ? (
            <ul>
              {reviewRows
                .filter(t => t.lesson)
                .map(t => (
                  <li key={t.id}>
                    <strong>
                      {t.date} · {t.asset}
                    </strong>{' '}
                    — {t.lesson}
                  </li>
                ))}
            </ul>
          ) : (
            <p>
              Ajoutez vos observations dans le journal pour préparer votre
              revue. Aucune conclusion automatique n’est inventée.
            </p>
          )}
          <button disabled={busy || editing !== null} onClick={download}>
            Exporter le cycle et son plan
          </button>
        </section>
      ) : null}
    </div>
  )
}
