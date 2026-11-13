import test from "node:test"
import assert from "node:assert/strict"
import { sameEvaluationDraft } from "./src/lib/evaluation-confirmation.ts"

test("confirmation remains valid only for the exact submitted draft and file", () => {
  const file = new File(["synthetic"], "answer.pdf")
  const draft = { question: "Discuss DBT.\nGive examples.", paper: "GS2", marks: "10", wordLimit: "150", file }
  assert.equal(sameEvaluationDraft(null, draft), false)
  assert.equal(sameEvaluationDraft({ ...draft }, draft), true)
  for (const patch of [{ question: "A different question" }, { paper: "Essay" }, { marks: "15" }, { wordLimit: "250" }, { file: new File(["changed"], "answer.pdf") }]) {
    assert.equal(sameEvaluationDraft(draft, { ...draft, ...patch }), false)
  }
})
