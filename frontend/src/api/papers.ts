import type { PaperMeta } from "@/types/paper"
import type { Question } from "@/types/question"

export interface PaperQuestions {
  paper: PaperMeta
  questions: Question[]
}

/** Fetch a public paper's questions from the backend */
export async function fetchPaperQuestions(paperId: string): Promise<PaperQuestions> {
  const [paperRes, questionsRes] = await Promise.all([
    fetch(`/api/papers/${paperId}`),
    fetch(`/api/papers/${paperId}/questions`),
  ])

  if (!paperRes.ok) throw new Error(`Failed to fetch paper: ${paperRes.statusText}`)
  if (!questionsRes.ok) throw new Error(`Failed to fetch questions: ${questionsRes.statusText}`)

  const paper = await paperRes.json()
  const questions = await questionsRes.json()

  return { paper, questions }
}
