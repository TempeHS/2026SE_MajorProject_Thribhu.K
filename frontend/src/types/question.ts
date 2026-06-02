// Types matching the tppr-question.json schema

export type ContentBlock = TextBlock | ImageBlock | TableBlock

export interface TextBlock {
  kind: "text"
  text: string
}

export interface ImageBlock {
  kind: "image"
  url: string
  mime_type?: string
  alt?: string
  width?: number
  height?: number
}

export interface TableBlock {
  kind: "table"
  html: string
}

export interface ChoiceOption {
  label: string
  content: ContentBlock[]
}

export interface QuestionPart {
  label: string
  stimulus?: ContentBlock[]
  content: ContentBlock[]
  marks?: number
}

export interface SyllabusPoint {
  syllabus_id: string
  point_code: string
  label?: string
}

export type QuestionType = "multiple_choice" | "short_answer" | "long_answer"
export type Difficulty = "easy" | "medium" | "hard"

export interface Question {
  id: string
  paper_id: string
  author_id: string
  number: number
  type: QuestionType
  marks: number
  stimulus?: ContentBlock[]
  content?: ContentBlock[]  // optional for long_answer with parts only
  parts?: QuestionPart[]
  options?: ChoiceOption[]
  answer?: string
  topics?: string[]
  syllabus_points?: SyllabusPoint[]
  difficulty?: Difficulty
  created_at: string
  updated_at: string
}
