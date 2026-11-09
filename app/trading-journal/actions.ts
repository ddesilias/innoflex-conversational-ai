'use server'

import { auth } from '@/auth'
import { kv } from '@vercel/kv'
import { parseCycleDraft, type CycleDraft } from '@/lib/trading/review'
import {
  saveTradingCycleScript,
  tradingCycleKey,
  tradingCycleIndexKey,
  validCycleId
} from '@/lib/trading/storage'

export async function loadTradingDraft(
  cycleId = 'default'
): Promise<
  | { ok: true; draft: CycleDraft | null; revision: number }
  | { ok: false; message: string }
> {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false, message: 'Connecte-toi pour retrouver ton cycle.' }
  if (!validCycleId(cycleId)) return { ok: false, message: 'Cycle invalide.' }
  try {
    const saved = await kv.hgetall<{ draft: string; revision: number }>(
      tradingCycleKey(session.user.id, cycleId)
    )
    if (!saved) return { ok: true, draft: null, revision: 0 }
    const revision = Number(saved.revision)
    if (
      !Number.isSafeInteger(revision) ||
      revision < 1 ||
      typeof saved.draft !== 'string' ||
      !saved.draft.startsWith('g20:')
    )
      throw Error('Invalid stored cycle')
    return { ok: true, draft: parseCycleDraft(saved.draft.slice(4)), revision }
  } catch {
    return {
      ok: false,
      message:
        'Lecture indisponible. Ton brouillon reste intact ; tu peux l’exporter.'
    }
  }
}

export async function saveTradingDraft(
  text: string,
  revision: number,
  cycleId = 'default'
) {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false, message: 'Connecte-toi pour enregistrer ton cycle.' }
  if (
    !validCycleId(cycleId) ||
    typeof text !== 'string' ||
    Buffer.byteLength(text, 'utf8') > 750_000 ||
    !Number.isSafeInteger(revision) ||
    revision < 0
  )
    return { ok: false, message: 'Cycle trop volumineux ou révision invalide.' }
  let draft: CycleDraft
  try {
    draft = parseCycleDraft(text)
  } catch {
    return { ok: false, message: 'Cycle invalide. Vérifie les saisies.' }
  }
  try {
    const next = Number(
      await kv.eval(
        saveTradingCycleScript,
        [
          tradingCycleKey(session.user.id, cycleId),
          tradingCycleIndexKey(session.user.id)
        ],
        [
          revision,
          'g20:' + JSON.stringify(draft),
          cycleId,
          'meta:' +
            JSON.stringify({
              name: draft.cycle,
              updatedAt: new Date().toISOString(),
              mode: draft.mode,
              currency: draft.currency
            })
        ]
      )
    )
    if (next === -1)
      return {
        ok: false,
        message:
          'La limite de 50 cycles est atteinte. Tes cycles existants restent disponibles.'
      }
    if (!next)
      return {
        ok: false,
        message:
          'Une autre sauvegarde existe. Exporte ton brouillon, puis recharge le cycle du compte avant de continuer.'
      }
    return {
      ok: true,
      revision: next,
      message: 'Cycle enregistré sur ton compte dans cet environnement.'
    }
  } catch {
    return {
      ok: false,
      message:
        'Enregistrement indisponible. Exporte ton brouillon pour le conserver.'
    }
  }
}

export async function listTradingCycles(): Promise<
  | { ok: true; cycles: { id: string; name: string; updatedAt: string }[] }
  | { ok: false; message: string }
> {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false, message: 'Connecte-toi pour voir tes cycles.' }
  try {
    const index =
      (await kv.hgetall<Record<string, string>>(
        tradingCycleIndexKey(session.user.id)
      )) || {}
    const cycles: { id: string; name: string; updatedAt: string }[] = []
    for (const [id, raw] of Object.entries(index)) {
      if (
        !validCycleId(id) ||
        typeof raw !== 'string' ||
        !raw.startsWith('meta:')
      )
        continue
      const meta = JSON.parse(raw.slice(5))
      if (
        typeof meta.name === 'string' &&
        meta.name.length <= 100 &&
        typeof meta.updatedAt === 'string'
      )
        cycles.push({ id, name: meta.name, updatedAt: meta.updatedAt })
    }
    // The first single-cycle release used this key without an index. Preserve it.
    if (!cycles.some(c => c.id === 'default')) {
      const legacy = await kv.hgetall<{ draft: string }>(
        tradingCycleKey(session.user.id, 'default')
      )
      if (legacy?.draft?.startsWith('g20:'))
        cycles.push({
          id: 'default',
          name: parseCycleDraft(legacy.draft.slice(4)).cycle,
          updatedAt: ''
        })
    }
    return {
      ok: true,
      cycles: cycles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
  } catch {
    return {
      ok: false,
      message: 'Liste des cycles indisponible. Ton brouillon reste intact.'
    }
  }
}
