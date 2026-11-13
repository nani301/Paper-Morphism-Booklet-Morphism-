import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import React, { useState, useEffect } from "react"

// Test React component
function SmokeComponent({ title }: { title: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(1)
  }, [])

  return (
    <div data-testid="smoke-root">
      <h1>{title}</h1>
      <span data-testid="count">{count}</span>
    </div>
  )
}

describe("Vitest & Happy-DOM Smoke Test", () => {
  it("verifies happy-dom environment is active", () => {
    expect(typeof window).toBe("object")
    expect(typeof document).toBe("object")
    expect(document.body).toBeDefined()
  })

  it("verifies process.env.TZ is Asia/Kolkata", () => {
    expect(process.env.TZ).toBe("Asia/Kolkata")
  })

  it("verifies React 19 component rendering and DOM manipulation", () => {
    const { unmount } = render(<SmokeComponent title="Ekalavya Challenge Test" />)

    expect(screen.getByTestId("smoke-root")).toBeDefined()
    expect(screen.getByText("Ekalavya Challenge Test")).toBeDefined()
    expect(screen.getByTestId("count").textContent).toBe("1")

    unmount()
    expect(screen.queryByTestId("smoke-root")).toBeNull()
  })

  it("verifies cleanup() empties document.body after unmount", () => {
    render(<SmokeComponent title="Temporary Render" />)
    expect(screen.getByText("Temporary Render")).toBeDefined()
    // afterEach hook in setup.ts runs cleanup() after each test
  })

  it("verifies document.body was cleaned up from previous test", () => {
    // Because afterEach(() => cleanup()) is in setup.ts, previous renders should be removed
    expect(screen.queryByText("Temporary Render")).toBeNull()
  })
})
