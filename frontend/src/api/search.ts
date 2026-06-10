import type { PaperMeta } from "@/types/paper"

export interface SearchParams {
  q?: string
  subject?: string
  outcomes?: string[]
  source?: string
  course_level?: string
  year?: string
  page?: number
  per_page?: number
}

export interface SearchResult {
  papers: PaperMeta[]
  total: number
  page: number
  per_page: number
}

export async function searchPapers(params: SearchParams): Promise<SearchResult> {
  const url = new URL("/api/papers/search", window.location.origin)

  if (params.q) url.searchParams.set("q", params.q)
  if (params.subject) url.searchParams.set("subject", params.subject)
  if (params.outcomes && params.outcomes.length > 0) {
    url.searchParams.set("outcomes", params.outcomes.join(","))
  }
  if (params.source) url.searchParams.set("source", params.source)
  if (params.course_level) url.searchParams.set("course_level", params.course_level)
  if (params.year) url.searchParams.set("year", params.year)
  if (params.page) url.searchParams.set("page", String(params.page))
  if (params.per_page) url.searchParams.set("per_page", String(params.per_page))

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Search failed: ${res.statusText}`)
  }
  return res.json()
}
