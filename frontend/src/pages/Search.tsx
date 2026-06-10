import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import NavBar from "@/components/navbar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDebounce } from "@/hooks/use-debounce"
import { useCart } from "@/hooks/use-cart"
import { searchPapers, type SearchResult } from "@/api/search"
import { ALL_OUTCOMES } from "@/types/outcome"
import { PaperDetailDialog } from "@/components/paper-detail-dialog"
import { CartSheet } from "@/components/cart-sheet"
import type { PaperMeta } from "@/types/paper"
import { Search, FileText, Clock, X, Filter, SlidersHorizontal, GraduationCap, ShoppingCart } from "lucide-react"

const DEBOUNCE_DELAY = 400

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Search state
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [subject, setSubject] = useState(searchParams.get("subject") ?? "")
  const [source, setSource] = useState(searchParams.get("source") ?? "")
  const [courseLevel, setCourseLevel] = useState(searchParams.get("course_level") ?? "")
  const [year, setYear] = useState(searchParams.get("year") ?? "")
  const [outcomeInput, setOutcomeInput] = useState("")
  const [outcomes, setOutcomes] = useState<string[]>(() => {
    const o = searchParams.get("outcomes")
    return o ? o.split(",").filter(Boolean) : []
  })

  // Results state
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Paper detail + cart state
  const [selectedPaper, setSelectedPaper] = useState<PaperMeta | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const { items: cartItems } = useCart()

  // Debounce the query input
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY)
  const debouncedSubject = useDebounce(subject, DEBOUNCE_DELAY)
  const hasAnyFilter = !!(debouncedQuery || debouncedSubject || outcomes.length > 0 || source || courseLevel || year)

  // Use a ref to track pending state
  const pendingRef = useRef(false)

  // Perform search when debounced values or filters change
  useEffect(() => {
    if (!hasAnyFilter) {
      pendingRef.current = false
      return
    }

    let cancelled = false
    pendingRef.current = true

    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    searchPapers({
      q: debouncedQuery || undefined,
      subject: debouncedSubject || undefined,
      outcomes: outcomes.length > 0 ? outcomes : undefined,
      source: source || undefined,
      course_level: courseLevel || undefined,
      year: year || undefined,
    })
      .then((result) => {
        if (!cancelled) {
          setResults(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Search failed")
      })
      .finally(() => {
        if (!cancelled) {
          pendingRef.current = false
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [hasAnyFilter, debouncedQuery, debouncedSubject, outcomes, source, courseLevel, year, retryCount])

  // Sync state to URL params
  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedQuery) params.q = debouncedQuery
    if (debouncedSubject) params.subject = debouncedSubject
    if (outcomes.length > 0) params.outcomes = outcomes.join(",")
    if (source) params.source = source
    if (courseLevel) params.course_level = courseLevel
    if (year) params.year = year
    setSearchParams(params, { replace: true })
  }, [debouncedQuery, debouncedSubject, outcomes, source, courseLevel, year, setSearchParams])

  function addOutcomesFromInput() {
    const codes = outcomeInput
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s && !outcomes.includes(s))
    if (codes.length > 0) {
      setOutcomes([...outcomes, ...codes])
    }
    setOutcomeInput("")
  }

  function removeOutcome(code: string) {
    setOutcomes(outcomes.filter((o) => o !== code))
  }

  function handleOutcomeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addOutcomesFromInput()
    }
    // Remove last outcome on backspace when input is empty
    if (e.key === "Backspace" && !outcomeInput && outcomes.length > 0) {
      setOutcomes(outcomes.slice(0, -1))
    }
  }

  function handleOutcomeBlur() {
    if (outcomeInput.trim()) {
      addOutcomesFromInput()
    }
  }

  function clearAllFilters() {
    setQuery("")
    setSubject("")
    setSource("")
    setCourseLevel("")
    setYear("")
    setOutcomes([])
    setOutcomeInput("")
  }

  const hasActiveFilters = subject || source || courseLevel || year || outcomes.length > 0

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Search Papers</h1>
            <p className="text-sm text-muted-foreground">
              Find publicly published papers by title, subject, or outcomes.
            </p>
          </div>

          {/* Search input */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search papers by title or keyword..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter toggle + active filters summary */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal data-icon="inline-start" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {[subject, source, courseLevel, year].filter(Boolean).length + outcomes.length}
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X data-icon="inline-start" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Subject filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="e.g. Physics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Source filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Source</label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hsc">HSC</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Course level filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Course Level</label>
                  <Select value={courseLevel} onValueChange={setCourseLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="extension_1">Extension 1</SelectItem>
                      <SelectItem value="extension_2">Extension 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Year</label>
                  <Input
                    type="number"
                    placeholder="e.g. 2024"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
              </div>

              {/* Outcomes filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <GraduationCap className="size-4" />
                  Outcomes
                  <span className="text-muted-foreground font-normal">
                    (comma-separated, papers must assess all)
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                  {outcomes.map((code) => (
                    <Badge key={code} variant="secondary" className="gap-1">
                      {code}
                      <button
                        onClick={() => removeOutcome(code)}
                        className="ml-0.5 rounded-full hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    className="flex-1 min-w-30 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder={outcomes.length === 0 ? "e.g. ME12-1, ME12-3" : "Add more..."}
                    value={outcomeInput}
                    onChange={(e) => setOutcomeInput(e.target.value)}
                    onKeyDown={handleOutcomeKeyDown}
                    onBlur={handleOutcomeBlur}
                  />
                </div>
                {outcomes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {outcomes.length} outcome{outcomes.length !== 1 ? "s" : ""} selected — press Enter or comma to add
                  </p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Results */}
          {loading && <SearchSkeleton />}

          {error && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setRetryCount((c) => c + 1)}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && !error && results && results.papers.length === 0 && (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
              <Filter className="size-10 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">No papers found</h2>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && results && results.papers.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {results.total} {results.total === 1 ? "paper" : "papers"} found
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} onClick={() => setSelectedPaper(paper)} />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && !hasAnyFilter && (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
              <Search className="size-10 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Search for papers</h2>
                <p className="text-sm text-muted-foreground">
                  Enter a search term or apply filters to find publicly published papers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating cart button */}
        {cartItems.length > 0 && (
          <Button
            className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="size-5" />
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {cartItems.length}
            </span>
          </Button>
        )}
      </main>

      {/* Paper detail dialog */}
      <PaperDetailDialog
        paper={selectedPaper}
        open={!!selectedPaper}
        onOpenChange={(open) => { if (!open) setSelectedPaper(null) }}
      />

      {/* Cart sheet */}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </>
  )
}

function PaperCard({ paper, onClick }: { paper: PaperMeta; onClick?: () => void }) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{paper.title}</CardTitle>
          {paper.source && (
            <Badge variant="outline">{paper.source}</Badge>
          )}
        </div>
        <CardDescription>{paper.subject}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3.5" />
              {paper.question_count} questions
            </span>
            <span>{paper.total_marks} marks</span>
            {paper.year && <span>{paper.year}</span>}
          </div>
          {paper.outcomes && paper.outcomes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {paper.outcomes.map((code) => {
                const outcome = ALL_OUTCOMES.get(code)
                return (
                  <Tooltip key={code}>
                    <TooltipTrigger asChild>
                      <span>
                        <Badge variant="default" className="text-xs">
                          {code}
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    {outcome && (
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">{outcome.description}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {new Date(paper.created_at).toLocaleDateString()}
        </span>
      </CardFooter>
    </Card>
  )
}

function SearchSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-3 w-1/3" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
