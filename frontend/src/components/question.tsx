import { useState } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

import type {
  Question as QuestionData,
  ContentBlock,
  ChoiceOption,
  QuestionPart,
} from "@/types/question"

// --- LaTeX rendering ---

function renderLatex(text: string): string {
  // Replace display math $$...$$ first, then inline $...$
  let result = text.replace(/\$\$(.+?)\$\$/gs, (_match, expr) => {
    try {
      return katex.renderToString(expr, { displayMode: true, throwOnError: false })
    } catch {
      return _match
    }
  })
  result = result.replace(/\$(.+?)\$/g, (_match, expr) => {
    try {
      return katex.renderToString(expr, { displayMode: false, throwOnError: false })
    } catch {
      return _match
    }
  })
  return result
}

function renderLatexInHtml(html: string): string {
  // Process text nodes inside HTML that may contain LaTeX
  // Match content between > and < (text nodes inside tags)
  return html.replace(/>([^<]+)</g, (_match, text) => {
    if (text.includes("$")) {
      return `>${renderLatex(text)}<`
    }
    return _match
  })
}

// --- Content rendering ---

function TextContent({ text }: { text: string }) {
  const hasLatex = text.includes("$")
  if (!hasLatex) {
    return <p className="whitespace-pre-wrap">{text}</p>
  }
  const html = renderLatex(text)
  return <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: html }} />
}

function ContentBlockView({ block, imageScale = 1 }: { block: ContentBlock; imageScale?: number }) {
  switch (block.kind) {
    case "text":
      return <TextContent text={block.text} />
    case "image": {
      const baseWidth = block.width ?? 400
      const scaledWidth = baseWidth * imageScale
      return (
        <img
          src={block.url}
          alt={block.alt ?? ""}
          className={cn("rounded-md object-contain", imageScale > 1 && "mx-auto")}
          style={{
            maxWidth: `${scaledWidth}px`,
            height: block.height ? `${block.height * imageScale}px` : "auto",
          }}
        />
      )
    }
    case "table":
      return (
        <div
          className="mx-auto w-fit overflow-x-auto rounded-md border [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:text-center [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-center"
          dangerouslySetInnerHTML={{ __html: renderLatexInHtml(block.html) }}
        />
      )
  }
}

function ContentBlocks({ blocks, imageScale = 1 }: { blocks: ContentBlock[]; imageScale?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => (
        <ContentBlockView key={i} block={block} imageScale={imageScale} />
      ))}
    </div>
  )
}

// --- Sub-components ---

function Stimulus({ blocks, imageScale }: { blocks: ContentBlock[]; imageScale?: number }) {
  return <ContentBlocks blocks={blocks} imageScale={imageScale} />
}

function MultipleChoiceOptions({
  questionId,
  options,
  selected,
  answer,
  onSelect,
}: {
  questionId: string
  options: ChoiceOption[]
  selected?: string
  answer?: string
  onSelect?: (label: string) => void
}) {
  // Detect if all options have images → use 2x2 grid layout
  const hasImages = options.every((o) => o.content.some((b) => b.kind === "image"))

  const getOptionClassName = (label: string) =>
    cn(
      "transition-colors",
      answer === label && "border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/20",
      selected === label && answer !== label && "border-primary/20 bg-primary/5",
      !selected && !answer && "border-transparent hover:bg-muted/50",
      selected !== label && answer !== label && "border-transparent hover:bg-muted/50"
    )

  if (hasImages) {
    return (
      <RadioGroup
        value={selected}
        onValueChange={onSelect}
        className="grid grid-cols-2 gap-3"
      >
        {options.map((option) => (
          <Label
            key={option.label}
            htmlFor={`${questionId}-option-${option.label}`}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3",
              getOptionClassName(option.label)
            )}
          >
            <div className="flex w-full items-center gap-2">
              <RadioGroupItem
                value={option.label}
                id={`${questionId}-option-${option.label}`}
                className={cn(
                  "shrink-0",
                  answer === option.label && "border-emerald-500 data-checked:border-emerald-500 data-checked:bg-emerald-500"
                )}
              />
              <span className={cn(
                "font-medium",
                answer === option.label ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {option.label}.
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ContentBlocks blocks={option.content} />
            </div>
          </Label>
        ))}
      </RadioGroup>
    )
  }

  // Text-only or mixed: vertical list
  return (
    <RadioGroup value={selected} onValueChange={onSelect} className="gap-0">
      {options.map((option) => (
        <Label
          key={option.label}
          htmlFor={`${questionId}-option-${option.label}`}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5",
            getOptionClassName(option.label)
          )}
        >
          <RadioGroupItem
            value={option.label}
            id={`${questionId}-option-${option.label}`}
            className={cn(
              "mt-0.5 shrink-0",
              answer === option.label && "border-emerald-500 data-checked:border-emerald-500 data-checked:bg-emerald-500"
            )}
          />
          <span className={cn(
            "mr-2 font-medium",
            answer === option.label ? "text-emerald-600" : "text-muted-foreground"
          )}>
            {option.label}.
          </span>
          <div className="flex-1">
            <ContentBlocks blocks={option.content} />
          </div>
        </Label>
      ))}
    </RadioGroup>
  )
}

function Part({ part, index, imageScale }: { part: QuestionPart; index: number; imageScale?: number }) {
  return (
    <div className="flex gap-3 pl-2">
      <span className="mt-0.5 font-medium text-muted-foreground">
        ({part.label ?? String.fromCharCode(97 + index)})
      </span>
      <div className="flex flex-1 flex-col gap-2">
        {part.stimulus && part.stimulus.length > 0 && (
          <Stimulus blocks={part.stimulus} imageScale={imageScale} />
        )}
        <ContentBlocks blocks={part.content} imageScale={imageScale} />
        {part.marks != null && (
          <span className="text-xs text-muted-foreground">
            {part.marks} {part.marks === 1 ? "mark" : "marks"}
          </span>
        )}
      </div>
    </div>
  )
}

// --- Main component ---

export interface QuestionProps {
  question: QuestionData
  className?: string
  selectedOption?: string
  onSelectOption?: (label: string) => void
}

export function Question({
  question,
  className,
  selectedOption,
  onSelectOption,
}: QuestionProps) {
  const [internalSelected, setInternalSelected] = useState<string | undefined>(
    question.answer
  )
  const selected = selectedOption ?? internalSelected
  const onSelect = onSelectOption ?? setInternalSelected

  const imageScale = question.type === "multiple_choice" ? 1 : 1.5

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10",
        className
      )}
    >
      {/* Header: question number + marks + type badge */}
      <div className="flex items-center justify-between">
        <span className="text-base font-medium">
          Question {question.number}
        </span>
        <div className="flex items-center gap-2">
          {question.outcomes?.map((code) => (
            <Badge key={code} variant="secondary">
              {code}
            </Badge>
          ))}
          <Badge variant="outline">
            {question.marks} {question.marks === 1 ? "mark" : "marks"}
          </Badge>
        </div>
      </div>

      {/* Stimulus */}
      {question.stimulus && question.stimulus.length > 0 && (
        <Stimulus blocks={question.stimulus} imageScale={imageScale} />
      )}

      {/* Question content */}
      {question.content && question.content.length > 0 && (
        <ContentBlocks blocks={question.content} imageScale={imageScale} />
      )}

      {/* Multiple choice options */}
      {question.type === "multiple_choice" && question.options && (
        <MultipleChoiceOptions
          questionId={question.id}
          options={question.options}
          selected={selected}
          answer={question.answer}
          onSelect={onSelect}
        />
      )}

      {/* Long answer parts */}
      {question.parts && question.parts.length > 0 && (
        <div className="flex flex-col gap-4">
          {question.parts.map((part, i) => (
            <Part key={part.label ?? i} part={part} index={i} imageScale={imageScale} />
          ))}
        </div>
      )}
    </div>
  )
}
