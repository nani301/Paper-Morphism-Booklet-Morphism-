import { supabase } from "./supabase"

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.trim().replace(/\/+$/, "") ||
  (import.meta.env.DEV ? "http://localhost:3001" : "")

/**
 * Validates that BACKEND_URL is configured in production.
 */
export function getBackendUrl(): string {
  if (!BACKEND_URL && !import.meta.env.DEV) {
    throw new Error(
      "The evaluation service is temporarily unavailable. Please try again later."
    )
  }
  return BACKEND_URL
}

/**
 * Enhanced fetch that automatically attaches the user's Supabase JWT access token
 * to authenticate backend requests.
 */
export async function authFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`)
      }
    } catch (_) {
      // In local offline mode or unauthenticated session
    }
  }

  return fetch(input, {
    ...init,
    headers,
  })
}
