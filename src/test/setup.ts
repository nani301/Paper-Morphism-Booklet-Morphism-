import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Ensure React Testing Library cleans up after each test
afterEach(() => {
  cleanup()
})

// Set default timezone for testing
process.env.TZ = "Asia/Kolkata"
