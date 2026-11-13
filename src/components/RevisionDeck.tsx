import { useEffect, useState } from 'react'
import { dueRevisionCards, reviewRevisionCard, saveRevisionCard, type RevisionCard, type ReviewRating } from '../lib/revision-deck'
import { revisionCandidates } from '../lib/revision-candidates'
import type { UpscEvaluationReport } from '../types/evaluation'

export function SaveRevisionCards({ report, evaluationId }: { report: UpscEvaluationReport; evaluationId?: string | null }) {
  const [saved, setSaved] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const cards = revisionCandidates(report)
  if (!cards.length) return null
  return <section className="bg-card rounded-xl border border-white/10 p-6 space-y-4">
    <h2 className="text-xl font-bold">Save for revision</h2>
    <p className="text-sm text-slate-med">Cited coaching suggestions from this report. Revisit the source before memorising a factual claim. First review is due in three days, in Notes Library.</p>
    {error && <p role="alert" className="text-eka-danger">{error}</p>}
    {cards.map(card => <div key={card.text} className="bg-navy-deep rounded-lg p-4 space-y-2">
      <p>{card.text}</p><p className="text-xs text-slate-med">{card.citation}</p>
      <button disabled={!!busy || saved.includes(card.text)} className="border border-gold/40 rounded px-3 py-2 text-sm text-gold disabled:opacity-50" onClick={async () => {
        setBusy(card.text); setError('')
        try { await saveRevisionCard(card.text, card.citation, evaluationId); setSaved(current => [...current, card.text]) }
        catch (e) { setError(e instanceof Error ? e.message : 'Save failed. Please retry.') }
        finally { setBusy(null) }
      }}>{saved.includes(card.text) ? 'Saved' : busy === card.text ? 'Saving…' : 'Save to revision deck'}</button>
    </div>)}
  </section>
}

export default function RevisionDeck({ userId }: { userId?: string }) {
  const [cards, setCards] = useState<RevisionCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setCards([]); setRevealed([]); setError('')
    if (!userId) return
    setLoading(true)
    dueRevisionCards().then(items => { if (active) setCards(items) }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, refresh])
  if (!userId) return null
  return <section className="bg-card rounded-xl border border-white/10 p-6 my-6 space-y-4">
    <h2 className="text-xl font-bold">Your revision deck</h2>
    <button className="text-sm text-gold" disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>Refresh due cards</button>
    {loading && <p role="status">Loading revision cards…</p>}
    {error && <p role="alert" className="text-eka-danger">{error}</p>}
    {!loading && !error && !cards.length && <p className="text-slate-med">No cards due. Save cited suggestions from an evaluation to start your deck.</p>}
    {cards.map(card => <div key={card.id} className="bg-navy-deep rounded-lg p-4 space-y-3">
      <p className="text-sm text-slate-med">Recall the key point from: {card.source_citation || 'Your evaluation'}</p>
      {!revealed.includes(card.id) ? <button className="text-gold" onClick={() => setRevealed(current => [...current, card.id])}>Reveal revision point</button> : <>
        <p>{card.fodder_text}</p>
        <div className="flex flex-wrap gap-3">{(['forgot', 'hard', 'good', 'easy'] as ReviewRating[]).map(rating => <button className="border border-white/20 rounded px-3 py-2 capitalize disabled:opacity-50" disabled={busy} key={rating} onClick={async () => {
          setBusy(true); setError('')
          try { await reviewRevisionCard(card.id, rating); setCards(current => current.filter(item => item.id !== card.id)) }
          catch (e) { setError(e instanceof Error ? e.message : 'Review failed. Please retry.') }
          finally { setBusy(false) }
        }}>{rating}</button>)}</div>
      </>}
    </div>)}
  </section>
}
