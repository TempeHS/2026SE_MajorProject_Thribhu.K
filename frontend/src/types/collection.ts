import type { Question } from "./question"

export interface CollectionItem {
  question: Question
  source_paper_id: string
  source_paper_title: string
}

export interface Collection {
  id: string
  title: string
  description?: string
  items: CollectionItem[]
  total_marks: number
  created_at: string
  updated_at: string
}
