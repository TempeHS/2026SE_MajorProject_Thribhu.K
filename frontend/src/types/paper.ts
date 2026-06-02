// Types matching the tppr-paper-meta.json and tppr-paper.json schemas

import type { Question } from "./question"

export type PaperSource = "hsc" | "trial" | "internal" | "practice" | "custom"
export type CourseLevel = "standard" | "advanced" | "extension_1" | "extension_2"

export interface PaperMeta {
  id: string
  title: string
  author_id: string
  subject: string
  year?: number
  source?: PaperSource
  school?: string
  course_level?: CourseLevel
  topics?: string[]
  visibility: "private" | "public"
  question_count: number
  total_marks: number
  duration_minutes?: number
  created_at: string
  updated_at: string
}

export interface Paper extends PaperMeta {
  questions: Question[]
}
