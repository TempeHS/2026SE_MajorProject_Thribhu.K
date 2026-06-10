import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Question } from "@/components/question"
import { useCart } from "@/hooks/use-cart"
import { fetchPaperQuestions } from "@/api/papers"
import type { PaperMeta } from "@/types/paper"
import type { Question as QuestionData } from "@/types/question"
import { ALL_OUTCOMES } from "@/types/outcome"
import { Plus, Check, FileText, ShoppingCart } from "lucide-react"

interface PaperDetailDialogProps {
  paper: PaperMeta | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaperDetailDialog({ paper, open, onOpenChange }: PaperDetailDialogProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addItem, removeItem, isInCart } = useCart()
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!paper || !open) {
      pendingRef.current = false
      return
    }

    let cancelled = false
    pendingRef.current = true

    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    fetchPaperQuestions(paper.id)
      .then((result) => {
        if (!cancelled) {
          setQuestions(result.questions)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load questions")
      })
      .finally(() => {
        if (!cancelled) {
          pendingRef.current = false
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [paper, open])

  if (!paper) return null

  function handleToggleQuestion(question: QuestionData) {
    if (!paper) return
    if (isInCart(question.id)) {
      removeItem(question.id)
    } else {
      addItem({
        question,
        source_paper_id: paper.id,
        source_paper_title: paper.title,
      })
    }
  }

  function handleAddAll() {
    if (!paper) return
    for (const q of questions) {
      if (!isInCart(q.id)) {
        addItem({
          question: q,
          source_paper_id: paper.id,
          source_paper_title: paper.title,
        })
      }
    }
  }

  const addedCount = questions.filter((q) => isInCart(q.id)).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{paper.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>{paper.subject}</span>
            {paper.year && <span>• {paper.year}</span>}
            {paper.source && <Badge variant="outline">{paper.source}</Badge>}
            {paper.course_level && (
              <Badge variant="secondary">{paper.course_level.replace("_", " ")}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Outcomes */}
        {paper.outcomes && paper.outcomes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {paper.outcomes.map((code) => {
              const outcome = ALL_OUTCOMES.get(code)
              return (
                <Badge key={code} variant="default" className="text-xs">
                  {code}{outcome ? `: ${outcome.description.slice(0, 40)}...` : ""}
                </Badge>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {paper.question_count} questions • {paper.total_marks} marks
            {addedCount > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({addedCount} in cart)
              </span>
            )}
          </span>
          {questions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAll}
              disabled={addedCount === questions.length}
            >
              <ShoppingCart data-icon="inline-start" />
              {addedCount === questions.length ? "All added" : "Add all to cart"}
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading && <QuestionsLoadingSkeleton />}

          {error && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && questions.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No questions available</p>
                <p className="text-sm text-muted-foreground">
                  This paper doesn't have any questions yet.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && questions.length > 0 && (
            <div className="flex flex-col gap-4 pb-4">
              {questions.map((question) => {
                const inCart = isInCart(question.id)
                return (
                  <div key={question.id} className="relative">
                    <Question question={question} />
                    <div className="absolute right-3 top-3">
                      <Button
                        size="sm"
                        variant={inCart ? "secondary" : "default"}
                        onClick={() => handleToggleQuestion(question)}
                      >
                        {inCart ? (
                          <>
                            <Check data-icon="inline-start" />
                            In cart
                          </>
                        ) : (
                          <>
                            <Plus data-icon="inline-start" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function QuestionsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5 flex flex-col gap-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
