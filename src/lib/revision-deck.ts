import { supabase } from './supabase'

export type ReviewRating = 'forgot' | 'hard' | 'good' | 'easy'
export interface RevisionCard { id: string; fodder_text: string; source_citation: string; next_review_at: string }

async function authenticatedClient() {
  if (!supabase) throw new Error('Sign in to use your revision deck.')
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in to use your revision deck.')
  return { client: supabase, userId: data.user.id }
}
function check(error: { message: string; code?: string } | null) {
  if (error) throw new Error(['42P01', 'PGRST205', 'PGRST202'].includes(error.code || '')
    ? 'Revision deck is not available yet. Please try again later.'
    : 'Could not update your revision deck. Please retry.')
}
export async function saveRevisionCard(text: string, citation: string, evaluationId?: string | null) {
  const { client, userId } = await authenticatedClient()
  // Ignore duplicate saves: existing review dates and learning progress stay intact.
  const { error } = await client.from('student_fodder_deck').upsert({ user_id: userId, fodder_text: text.trim(), source_citation: citation,
    evaluation_id: evaluationId && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(evaluationId) ? evaluationId : null },
    { onConflict: 'user_id,fodder_text', ignoreDuplicates: true })
  check(error)
}
export async function dueRevisionCards(): Promise<RevisionCard[]> {
  const { client, userId } = await authenticatedClient()
  const { data, error } = await client.from('student_fodder_deck').select('id,fodder_text,source_citation,next_review_at')
    .eq('user_id', userId).lte('next_review_at', new Date().toISOString()).order('next_review_at').limit(20)
  check(error)
  return data || []
}
export async function reviewRevisionCard(id: string, rating: ReviewRating) {
  const { client } = await authenticatedClient()
  const { error } = await client.rpc('record_fodder_review', { p_card_id: id, p_rating: rating })
  check(error)
}
