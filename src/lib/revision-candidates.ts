import type { UpscEvaluationReport } from '../types/evaluation'

export function revisionCandidates(report: UpscEvaluationReport) {
  const sources = report.sourceCitations || []
  const seen = new Set<string>()
  return report.topperDeltaPack.exactValueAdditions.flatMap(item => {
    const text = item.recommendation.trim()
    const cited = sources.filter(source => item.sourceIds?.includes(source.id) && ['official', 'book', 'current_affairs'].includes(source.sourceType))
    if (!text || text.length > 600 || !cited.length || seen.has(text)) return []
    seen.add(text)
    return [{ text, citation: cited.map(source => `${source.title}, page ${source.page}`).join('; ').slice(0, 4000) }]
  }).slice(0, 3)
}
