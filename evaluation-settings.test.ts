import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizedPaper, settingsError, stageLabel } from './src/lib/evaluation-settings.ts'
import { publicError } from './src/lib/public-error.ts'

test('paper aliases select the intended rubric including ethics, essay and optional', () => {
  for (const [input, expected] of [['G1', 'GS1'], ['GS-II Polity', 'GS2'], ['General Studies III', 'GS3'], ['General Studies IV', 'GS4'], ['Ethics', 'GS4'], ['Essay', 'Essay'], ['Anthropology Optional', 'Optional']])
    assert.equal(normalizedPaper(input), expected)
  assert.equal(normalizedPaper('unclassified'), null)
})
test('settings reject blank, fractional and out-of-range inputs without defaulting', () => {
  for (const value of ['', '0', '-1', '10.5', 'NaN', 'Infinity', '251']) assert.ok(settingsError('GS2', value, '150'))
  for (const value of ['', '0', '12.5', '5001']) assert.ok(settingsError('Essay', '125', value))
  assert.equal(settingsError('Essay', '125', '1000'), null)
  assert.equal(settingsError('Optional', '20', '300'), null)
})
test('student-facing errors and stages do not echo provider diagnostics or URLs', () => {
  const fallback = 'Please try again.'
  for (const message of ['Gemini failed at https://private.run.app', '{"error":"SQL"}', 'Qdrant error', 'VITE_BACKEND_URL missing', 'arbitrary internal model failure'])
    assert.equal(publicError(message, fallback), fallback)
  assert.match(publicError('429 RESOURCE_EXHAUSTED'), /temporarily busy/)
  assert.match(publicError('Please confirm your question.'), /Please confirm/)
  for (const detail of ['has expired', 'was rejected', 'needs refreshing']) {
    const message = `Your question confirmation ${detail}. Check the question and click Confirm Question again.`
    assert.equal(publicError(new Error(message)), message)
  }
  assert.equal(stageLabel('gemini-unknown-stage'), 'Processing your evaluation')
  assert.equal(stageLabel('retrying'), 'Waiting to retry')
})
