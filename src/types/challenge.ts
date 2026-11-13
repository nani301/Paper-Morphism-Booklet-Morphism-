/**
 * Authoritative TypeScript interfaces matching the backend API contract
 * for the 21-Day Challenge in AnswerEvaluation.
 *
 * Source: ekalavya-backend/src/product/LiveProduct.ts & Practice.ts
 */

export interface PracticeQuestion {
  id: string
  version?: number
  paper: "GS1" | "GS2" | "GS3" | "GS4" | string
  topic: string
  directive?: string
  marks: number
  text: string
  source?: string
  sourceYear?: number | null
}

export type ChallengeDayStatus = "completed" | "missed" | "available" | "upcoming"

export interface ChallengeDay {
  dayNumber: number // 1 to 21
  assignedOn: string // YYYY-MM-DD (Asia/Kolkata)
  question: PracticeQuestion | null
  evaluationId: string | null
  completedAt?: string | null // ISO 8601 string or null
  signedIn?: boolean // Whether sign-in activity exists for assignedOn
  status: ChallengeDayStatus
}

export interface ChallengeEnrollment {
  startedOn: string // YYYY-MM-DD
  bankVersion: number // e.g. 1
}

export interface ChallengeUnenrolledResponse {
  enrollment: null
  days: ChallengeDay[]
  timezone: "Asia/Kolkata" | string
  completed?: number
  missed?: number
  streak?: number
  averageScore?: number | null
  nextFocus?: string | null
}

export interface ChallengeEnrolledResponse {
  enrollment: ChallengeEnrollment
  averageScore: number | null
  nextFocus: string | null
  days: ChallengeDay[]
  completed: number
  missed: number
  streak: number
  timezone: "Asia/Kolkata" | string
}

export type ChallengeApiResponse = ChallengeUnenrolledResponse | ChallengeEnrolledResponse

export interface ChallengeEnrollResponse {
  startedOn: string
  timezone: "Asia/Kolkata" | string
}

export interface ChallengeCompleteRequest {
  dayNumber: number
  evaluationId: string
}

export interface ChallengeCompleteResponse {
  completed: boolean
  dayNumber?: number
}

export interface ChallengeActivityResponse {
  activityOn: string
  timezone: "Asia/Kolkata" | string
}

export interface ApiErrorResponse {
  error: string
}
