'use server'

import { auth } from '@/auth'
import { kv } from '@vercel/kv'
import { parseCycleDraft, type CycleDraft } from '@/lib/trading/review'
import { saveTradingDraftScript, tradingDraftKey } from '@/lib/trading/storage'

export async function loadTradingDraft(): Promise<
  | { ok: true; draft: CycleDraft | null; revision: number }
  | { ok: false; message: string }
> {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false, message: 'Connecte-toi pour retrouver ton cycle.' }
  try {
    const saved = await kv.hgetall<{ draft: string; revision: number }>(
      tradingDraftKey(session.user.id)
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

export async function saveTradingDraft(text: string, revision: number) {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false, message: 'Connecte-toi pour enregistrer ton cycle.' }
  if (
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
        saveTradingDraftScript,
        [tradingDraftKey(session.user.id)],
        [revision, 'g20:' + JSON.stringify(draft)]
      )
    )
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
