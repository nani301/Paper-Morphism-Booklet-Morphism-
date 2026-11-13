/** Only known student-facing messages may be displayed; service diagnostics stay out of the UI. */
export function publicError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = typeof error === 'string' ? error : error instanceof Error ? error.message : ''
  if (/^Your question confirmation (has expired|needs refreshing|was rejected)/i.test(message)) return message
  if (/429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message))
    return 'Evaluations are temporarily busy. Please wait a few minutes and try again.'
  if (/https?:\/\/|localhost|VITE_|gemini|supabase|qdrant|googleapis|api.?key|stack|\{"|backend|port 3001/i.test(message)) return fallback
  if (/^(Please (sign in|enter|upload|confirm|select)|Your (question|settings)|The (file or question changed|question could not)|Enter (whole-number|a whole-number)|File exceeds|Unsupported format|No readable text|Evaluation not found|Your question confirmation needs refreshing)/i.test(message)) return message
  return fallback
}
