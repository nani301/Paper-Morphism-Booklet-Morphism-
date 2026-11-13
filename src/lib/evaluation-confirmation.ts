export interface EvaluationDraft {
  question: string
  paper: string
  marks: string
  wordLimit: string
  file: File | null
}

export function sameEvaluationDraft(a: EvaluationDraft | null, b: EvaluationDraft): boolean {
  return !!a && a.question.trim() === b.question.trim() && a.paper === b.paper &&
    a.marks === b.marks && a.wordLimit === b.wordLimit && a.file === b.file
}
