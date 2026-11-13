import test from 'node:test'
import assert from 'node:assert/strict'
import { revisionCandidates } from './src/lib/revision-candidates.ts'
import type { UpscEvaluationReport } from './src/types/evaluation.ts'

function fixture(): UpscEvaluationReport {
  return {
    sourceCitations: [
      { id: 'SOURCE 1', title: 'Official fixture', page: '3', sourceType: 'official', excerpt: 'Evidence' },
      { id: 'SOURCE 2', title: 'Style fixture', page: '4', sourceType: 'topper_copy', excerpt: 'Style' },
    ],
    topperDeltaPack: { missedDimensions: [], modelParagraphRewrite: '', exactValueAdditions: [
      { type: 'Concept', recommendation: 'Support accessibility.', sourceIds: ['SOURCE 1'] },
      { type: 'Concept', recommendation: 'Support accessibility.', sourceIds: ['SOURCE 1'] },
      { type: 'Fact', recommendation: 'Unsupported claim.', sourceIds: ['SOURCE 99'] },
      { type: 'Fact', recommendation: 'A topper assertion.', sourceIds: ['SOURCE 2'] },
    ] },
  } as UpscEvaluationReport
}
test('revision candidates use persisted authoritative citations and remove duplicates', () => {
  assert.deepEqual(revisionCandidates(fixture()), [{ text: 'Support accessibility.', citation: 'Official fixture, page 3' }])
})
test('legacy reports without citation IDs do not manufacture cards', () => {
  const report = fixture()
  report.topperDeltaPack.exactValueAdditions.forEach(item => { delete item.sourceIds })
  assert.deepEqual(revisionCandidates(report), [])
})
test('oversized suggestions are omitted intact and candidate count is bounded', () => {
  const report = fixture()
  report.topperDeltaPack.exactValueAdditions = Array.from({ length: 5 }, (_, i) => ({ type: 'Fact', recommendation: `Fact ${i}`, sourceIds: ['SOURCE 1'] }))
  report.topperDeltaPack.exactValueAdditions.unshift({ type: 'Fact', recommendation: 'x'.repeat(601), sourceIds: ['SOURCE 1'] })
  assert.equal(revisionCandidates(report).length, 3)
  assert.equal(revisionCandidates(report)[0].text, 'Fact 0')
})
