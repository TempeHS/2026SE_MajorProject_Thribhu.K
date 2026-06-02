import type { Paper, PaperMeta } from "@/types/paper"
import type { Question } from "@/types/question"

const STORAGE_KEY = "tppr_papers"

function readAll(): Paper[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Paper[]
  } catch {
    return []
  }
}

function writeAll(papers: Paper[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(papers))
}

export function listPapers(): PaperMeta[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return readAll().map(({ questions: _, ...meta }) => meta)
}

export function getPaper(id: string): Paper | undefined {
  return readAll().find((p) => p.id === id)
}

export function createPaper(paper: Paper): void {
  const papers = readAll()
  papers.push(paper)
  writeAll(papers)
}

export function updatePaper(id: string, updates: Partial<Omit<Paper, "id">>): Paper | undefined {
  const papers = readAll()
  const idx = papers.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  papers[idx] = { ...papers[idx], ...updates, updated_at: new Date().toISOString() }
  writeAll(papers)
  return papers[idx]
}

export function deletePaper(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id))
}

export function importPaper(paper: Paper, authorId?: string): Paper {
  const now = new Date().toISOString()
  const newPaper: Paper = {
    ...paper,
    id: crypto.randomUUID(),
    author_id: authorId ?? paper.author_id,
    created_at: now,
    updated_at: now,
    questions: paper.questions.map((q, i) => ({
      ...q,
      id: crypto.randomUUID(),
      paper_id: "", // will be set below
      number: i + 1,
    })),
  }
  newPaper.questions.forEach((q) => { q.paper_id = newPaper.id })
  newPaper.question_count = newPaper.questions.length
  newPaper.total_marks = newPaper.questions.reduce((sum, q) => sum + q.marks, 0)
  const papers = readAll()
  papers.push(newPaper)
  writeAll(papers)
  return newPaper
}

// Question-level helpers

export function addQuestion(paperId: string, question: Question): Paper | undefined {
  const papers = readAll()
  const idx = papers.findIndex((p) => p.id === paperId)
  if (idx === -1) return undefined
  papers[idx].questions.push(question)
  papers[idx].question_count = papers[idx].questions.length
  papers[idx].total_marks = papers[idx].questions.reduce((sum, q) => sum + q.marks, 0)
  papers[idx].updated_at = new Date().toISOString()
  writeAll(papers)
  return papers[idx]
}

export function updateQuestion(paperId: string, questionId: string, updates: Partial<Omit<Question, "id">>): Paper | undefined {
  const papers = readAll()
  const idx = papers.findIndex((p) => p.id === paperId)
  if (idx === -1) return undefined
  const qIdx = papers[idx].questions.findIndex((q) => q.id === questionId)
  if (qIdx === -1) return undefined
  papers[idx].questions[qIdx] = { ...papers[idx].questions[qIdx], ...updates, updated_at: new Date().toISOString() }
  papers[idx].total_marks = papers[idx].questions.reduce((sum, q) => sum + q.marks, 0)
  papers[idx].updated_at = new Date().toISOString()
  writeAll(papers)
  return papers[idx]
}

export function deleteQuestion(paperId: string, questionId: string): Paper | undefined {
  const papers = readAll()
  const idx = papers.findIndex((p) => p.id === paperId)
  if (idx === -1) return undefined
  papers[idx].questions = papers[idx].questions.filter((q) => q.id !== questionId)
  papers[idx].questions.forEach((q, i) => { q.number = i + 1 })
  papers[idx].question_count = papers[idx].questions.length
  papers[idx].total_marks = papers[idx].questions.reduce((sum, q) => sum + q.marks, 0)
  papers[idx].updated_at = new Date().toISOString()
  writeAll(papers)
  return papers[idx]
}

export function reorderQuestions(paperId: string, orderedIds: string[]): Paper | undefined {
  const papers = readAll()
  const idx = papers.findIndex((p) => p.id === paperId)
  if (idx === -1) return undefined
  const questionMap = new Map(papers[idx].questions.map((q) => [q.id, q]))
  papers[idx].questions = orderedIds
    .map((id) => questionMap.get(id))
    .filter((q): q is Question => q != null)
  papers[idx].questions.forEach((q, i) => { q.number = i + 1 })
  papers[idx].updated_at = new Date().toISOString()
  writeAll(papers)
  return papers[idx]
}
