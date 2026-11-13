export const PAPERS = ['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'] as const
export type Paper = typeof PAPERS[number]
export const PAPER_LABELS: Record<Paper, string> = {
  GS1: 'GS I', GS2: 'GS II', GS3: 'GS III', GS4: 'GS IV · Ethics', Essay: 'Essay', Optional: 'Optional',
}

export function normalizedPaper(value: string): Paper | null {
  const name = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (name.includes('OPTIONAL')) return 'Optional'
  if (name === 'ESSAY' || name === 'ESSAYPAPER') return 'Essay'
  if (name === 'ETHICS') return 'GS4'
  const match = name.match(/^(?:GS|G|GENERALSTUDIES)(IV|III|II|I|[1-4])(?:PAPER|ETHICS|HISTORY|GEOGRAPHY|POLITY|ECONOMY|SCIENCE|GOVERNANCE|$)/)
  if (!match) return null
  const number = ({ I: '1', II: '2', III: '3', IV: '4' } as Record<string, string>)[match[1]] || match[1]
  return `GS${number}` as Paper
}

export function settingsError(paper: string, marks: string, words: string): string | null {
  if (!PAPERS.includes(paper as Paper)) return 'Please select GS I–IV, Essay, or Optional.'
  if (!marks.trim() || !Number.isInteger(Number(marks)) || Number(marks) < 1 || Number(marks) > 250)
    return 'Enter whole-number marks from 1 to 250, as printed on the question.'
  if (!words.trim() || !Number.isInteger(Number(words)) || Number(words) < 1 || Number(words) > 5000)
    return 'Enter a whole-number word limit from 1 to 5000, as printed on the question.'
  return null
}

export function stageLabel(stage?: string | null): string {
  return ({ uploading: 'Uploading your answer', queued: 'Waiting to start', claimed: 'Preparing your evaluation',
    retrying: 'Waiting to retry', preprocessing: 'Preparing your pages', ocr: 'Reading your answer',
    retrieval: 'Finding relevant references', question_analysis: 'Checking the question requirements',
    evaluating: 'Reviewing your answer', scoring: 'Checking marks and preparing feedback',
    completed: 'Evaluation complete', failed: 'Evaluation could not finish' } as Record<string, string>)[stage || ''] || 'Processing your evaluation'
}
