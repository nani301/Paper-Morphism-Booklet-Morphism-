import { authFetch, BACKEND_URL } from "./api"

export async function loadEvaluationHistory<T>(): Promise<T[]> {
  const all: T[] = []
  const pageSize = 100
  for (let offset = 0; offset <= 1000; offset += pageSize) {
    const response = await authFetch(`${BACKEND_URL}/api/evaluations/user/history?limit=${pageSize}&offset=${offset}`)
    if (!response.ok) throw new Error(`Could not load evaluation history (HTTP ${response.status}).`)
    const body = await response.json()
    if (!Array.isArray(body.evaluations)) throw new Error("Evaluation history response was invalid.")
    all.push(...body.evaluations)
    if (body.evaluations.length < pageSize) return all
  }
  throw new Error("Evaluation history is too large to display completely. No partial analytics were shown.")
}
