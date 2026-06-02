import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import NavBar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Question } from "@/components/question"
import {
  getPaper,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/lib/paper-storage"
import type { Paper } from "@/types/paper"
import type {
  Question as QuestionData,
  QuestionType,
  ContentBlock,
  ChoiceOption,
  QuestionPart,
} from "@/types/question"
import { Plus, Pencil, Trash2, ArrowLeft, Image, Type, Table, GripVertical, Settings, Upload, Download } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/api/auth"
import { AuthPrompt } from "@/components/auth-prompt"
import { PaperSettingsDialog } from "@/components/paper-settings-dialog"

// --- Form types ---

type StimulusBlockKind = "text" | "image" | "table"

interface StimulusBlockForm {
  kind: StimulusBlockKind
  text: string        // used for text and table (html)
  imageData: string   // base64 data URL for images
}

interface OptionForm {
  text: string
  imageData: string  // base64 data URL, empty if no image
}

interface PartForm {
  stimulusBlocks: StimulusBlockForm[]
  content: string
  marks: number
}

interface QuestionForm {
  type: QuestionType
  marks: number
  stimulusBlocks: StimulusBlockForm[]
  content: string
  options: OptionForm[]
  answer: string  // correct answer label for MCQ (e.g. "A")
  parts: PartForm[]
  topics: string
}

const emptyOption: OptionForm = { text: "", imageData: "" }

const emptyPart: PartForm = { stimulusBlocks: [], content: "", marks: 1 }

const defaultForm: QuestionForm = {
  type: "short_answer",
  marks: 1,
  stimulusBlocks: [],
  content: "",
  options: [emptyOption, emptyOption, emptyOption],
  answer: "",
  parts: [],
  topics: "",
}

// --- Helpers ---

function extractText(blocks?: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) return ""
  const textBlock = blocks.find((b) => b.kind === "text")
  return textBlock?.kind === "text" ? textBlock.text : ""
}

function contentBlocksToOptionForm(blocks: ContentBlock[]): OptionForm {
  const text = blocks.find((b) => b.kind === "text")
  const image = blocks.find((b) => b.kind === "image")
  return {
    text: text?.kind === "text" ? text.text : "",
    imageData: image?.kind === "image" ? image.url : "",
  }
}

function optionFormToContentBlocks(opt: OptionForm): ContentBlock[] {
  const blocks: ContentBlock[] = []
  if (opt.text.trim()) blocks.push({ kind: "text", text: opt.text.trim() })
  if (opt.imageData) blocks.push({ kind: "image", url: opt.imageData })
  return blocks
}

function contentBlocksToStimulusForm(blocks?: ContentBlock[]): StimulusBlockForm[] {
  if (!blocks || blocks.length === 0) return []
  return blocks.map((block) => {
    switch (block.kind) {
      case "text":
        return { kind: "text" as const, text: block.text, imageData: "" }
      case "image":
        return { kind: "image" as const, text: "", imageData: block.url }
      case "table":
        return { kind: "table" as const, text: htmlTableToMarkdown(block.html), imageData: "" }
    }
  })
}

function stimulusFormToContentBlocks(blocks: StimulusBlockForm[]): ContentBlock[] | undefined {
  const result: ContentBlock[] = []
  for (const block of blocks) {
    if (block.kind === "text" && block.text.trim()) {
      result.push({ kind: "text", text: block.text.trim() })
    } else if (block.kind === "image" && block.imageData) {
      result.push({ kind: "image", url: block.imageData })
    } else if (block.kind === "table" && block.text.trim()) {
      result.push({ kind: "table", html: markdownTableToHtml(block.text.trim()) })
    }
  }
  return result.length > 0 ? result : undefined
}

// --- Markdown table conversion ---

function markdownTableToHtml(md: string): string {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return `<table><tr><td>${md}</td></tr></table>`

  // Check if it looks like a markdown table
  if (!lines[0].includes("|")) return `<table><tr><td>${md}</td></tr></table>`

  const parseRow = (line: string) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())

  const headers = parseRow(lines[0])

  // Skip separator line (e.g. |---|---|)
  const separatorIndex = lines.findIndex((l, i) => i > 0 && /^[\s|:-]+$/.test(l))
  const dataStart = separatorIndex >= 0 ? separatorIndex + 1 : 1

  let html = "<table><thead><tr>"
  for (const h of headers) {
    html += `<th>${h}</th>`
  }
  html += "</tr></thead><tbody>"

  for (let i = dataStart; i < lines.length; i++) {
    if (/^[\s|:-]+$/.test(lines[i])) continue
    const cells = parseRow(lines[i])
    html += "<tr>"
    for (const cell of cells) {
      html += `<td>${cell}</td>`
    }
    html += "</tr>"
  }
  html += "</tbody></table>"
  return html
}

function htmlTableToMarkdown(html: string): string {
  // Parse using a temporary DOM element
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  const table = doc.querySelector("table")
  if (!table) return html

  const rows: string[][] = []
  table.querySelectorAll("tr").forEach((tr) => {
    const cells: string[] = []
    tr.querySelectorAll("th, td").forEach((cell) => {
      cells.push(cell.textContent?.trim() ?? "")
    })
    if (cells.length > 0) rows.push(cells)
  })

  if (rows.length === 0) return html

  const colCount = Math.max(...rows.map((r) => r.length))
  const colWidths = Array.from({ length: colCount }, (_, col) =>
    Math.max(3, ...rows.map((r) => (r[col] ?? "").length))
  )

  const formatRow = (cells: string[]) =>
    "| " + cells.map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |"

  const lines: string[] = []
  lines.push(formatRow(rows[0]))
  lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |")
  for (let i = 1; i < rows.length; i++) {
    lines.push(formatRow(rows[i]))
  }

  return lines.join("\n")
}

// --- Sortable question item ---

function SortableQuestionItem({
  question,
  canEdit,
  onEdit,
  onDelete,
  onExport,
}: {
  question: QuestionData
  canEdit: boolean
  onEdit: (q: QuestionData) => void
  onDelete: (id: string) => void
  onExport: (q: QuestionData) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group relative", isDragging && "z-50 opacity-80")}
    >
      {canEdit && (
        <button
          type="button"
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 cursor-grab rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <Question question={question} />
      {canEdit && (
        <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onExport(question)}
          >
            <Download className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onEdit(question)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(question.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// --- Component ---

export default function PaperEditor() {
  const { paperId } = useParams<{ paperId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [paper, setPaper] = useState<Paper | undefined>(() =>
    paperId ? getPaper(paperId) : undefined
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<QuestionForm>(defaultForm)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !paperId || !paper) return

    const oldIndex = paper.questions.findIndex((q) => q.id === active.id)
    const newIndex = paper.questions.findIndex((q) => q.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(paper.questions, oldIndex, newIndex)
    reorderQuestions(paperId, reordered.map((q) => q.id))
    refreshPaper()
  }

  function handleImportQuestions() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,application/json"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file || !paperId || !paper) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          const questions = Array.isArray(data.questions)
            ? data.questions
            : Array.isArray(data)
              ? data
              : data.type && data.marks != null
                ? [data]
                : null
          if (!questions || questions.length === 0) {
            toast.error("No questions found in file")
            return
          }
          const startNumber = paper.questions.length + 1
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i]
            const now = new Date().toISOString()
            addQuestion(paperId, {
              ...q,
              id: crypto.randomUUID(),
              paper_id: paperId,
              author_id: String(user!.user_id),
              number: startNumber + i,
              created_at: now,
              updated_at: now,
            })
          }
          refreshPaper()
          toast.success(`Imported ${questions.length} question${questions.length > 1 ? "s" : ""}`)
        } catch {
          toast.error("Failed to parse JSON file")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function refreshPaper() {
    if (paperId) {
      setPaper(getPaper(paperId))
    }
  }

  function openCreateDialog() {
    setEditingId(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEditDialog(q: QuestionData) {
    setEditingId(q.id)
    setForm({
      type: q.type,
      marks: q.marks,
      stimulusBlocks: contentBlocksToStimulusForm(q.stimulus),
      content: extractText(q.content),
      options: q.options
        ? q.options.map((o) => contentBlocksToOptionForm(o.content))
        : [emptyOption, emptyOption, emptyOption],
      answer: q.answer ?? "",
      parts: q.parts
        ? q.parts.map((p) => ({
            stimulusBlocks: contentBlocksToStimulusForm(p.stimulus),
            content: extractText(p.content),
            marks: p.marks ?? 0,
          }))
        : [],
      topics: q.topics?.join(", ") ?? "",
    })
    setDialogOpen(true)
  }

  function handleDelete(questionId: string) {
    if (!paperId) return
    deleteQuestion(paperId, questionId)
    refreshPaper()
  }

  function handleExportQuestion(q: QuestionData) {
    const blob = new Blob([JSON.stringify(q, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `question_${q.number}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSubmit() {
    if (!paperId || !paper) return

    const marks = form.type === "multiple_choice" ? 1 : form.marks
    const stimulus = stimulusFormToContentBlocks(form.stimulusBlocks)
    const content: ContentBlock[] | undefined = form.content.trim()
      ? [{ kind: "text" as const, text: form.content.trim() }]
      : undefined

    const options: ChoiceOption[] | undefined =
      form.type === "multiple_choice"
        ? form.options
            .map((opt, i) => ({
              label: String.fromCharCode(65 + i),
              content: optionFormToContentBlocks(opt),
            }))
            .filter((o) => o.content.length > 0)
        : undefined

    const parts: QuestionPart[] | undefined =
      form.type === "long_answer" && form.parts.length > 0
        ? form.parts.map((p, i) => ({
            label: String.fromCharCode(97 + i),
            stimulus: stimulusFormToContentBlocks(p.stimulusBlocks),
            content: [{ kind: "text" as const, text: p.content }],
            marks: p.marks,
          }))
        : undefined

    const topics = form.topics
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const answer = form.type === "multiple_choice" && form.answer ? form.answer : undefined

    if (editingId) {
      updateQuestion(paperId, editingId, {
        type: form.type,
        marks,
        stimulus,
        content,
        options,
        parts,
        answer,
        topics: topics.length > 0 ? topics : undefined,
      })
    } else {
      const now = new Date().toISOString()
      const newQuestion: QuestionData = {
        id: crypto.randomUUID(),
        paper_id: paperId,
        author_id: String(user!.user_id),
        number: paper.questions.length + 1,
        type: form.type,
        marks,
        stimulus,
        content,
        options,
        parts,
        answer,
        topics: topics.length > 0 ? topics : undefined,
        created_at: now,
        updated_at: now,
      }
      addQuestion(paperId, newQuestion)
    }

    setDialogOpen(false)
    refreshPaper()
  }

  function updateFormField<K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // --- Option helpers (dynamic add/remove) ---

  function addOption() {
    setForm((prev) => ({ ...prev, options: [...prev.options, emptyOption] }))
  }

  function removeOption(index: number) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  function updateOption(index: number, updates: Partial<OptionForm>) {
    setForm((prev) => {
      const options = [...prev.options]
      options[index] = { ...options[index], ...updates }
      return { ...prev, options }
    })
  }

  function handleOptionImageUpload(index: number, file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      updateOption(index, { imageData: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  // --- Stimulus block helpers ---

  function addStimulusBlock(kind: StimulusBlockKind) {
    setForm((prev) => ({
      ...prev,
      stimulusBlocks: [...prev.stimulusBlocks, { kind, text: "", imageData: "" }],
    }))
  }

  function removeStimulusBlock(index: number) {
    setForm((prev) => ({
      ...prev,
      stimulusBlocks: prev.stimulusBlocks.filter((_, i) => i !== index),
    }))
  }

  function updateStimulusBlock(index: number, updates: Partial<StimulusBlockForm>) {
    setForm((prev) => {
      const blocks = [...prev.stimulusBlocks]
      blocks[index] = { ...blocks[index], ...updates }
      return { ...prev, stimulusBlocks: blocks }
    })
  }

  function handleImageUpload(index: number, file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      updateStimulusBlock(index, { imageData: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  // --- Part helpers ---

  function addPart() {
    setForm((prev) => ({
      ...prev,
      parts: [...prev.parts, { ...emptyPart }],
    }))
  }

  function removePart(index: number) {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== index),
    }))
  }

  function updatePart(index: number, field: keyof PartForm, value: string | number | StimulusBlockForm[]) {
    setForm((prev) => {
      const parts = [...prev.parts]
      parts[index] = { ...parts[index], [field]: value }
      return { ...prev, parts }
    })
  }

  function addPartStimulusBlock(partIndex: number, kind: StimulusBlockKind) {
    setForm((prev) => {
      const parts = [...prev.parts]
      parts[partIndex] = {
        ...parts[partIndex],
        stimulusBlocks: [...parts[partIndex].stimulusBlocks, { kind, text: "", imageData: "" }],
      }
      return { ...prev, parts }
    })
  }

  function removePartStimulusBlock(partIndex: number, blockIndex: number) {
    setForm((prev) => {
      const parts = [...prev.parts]
      parts[partIndex] = {
        ...parts[partIndex],
        stimulusBlocks: parts[partIndex].stimulusBlocks.filter((_, i) => i !== blockIndex),
      }
      return { ...prev, parts }
    })
  }

  function updatePartStimulusBlock(partIndex: number, blockIndex: number, updates: Partial<StimulusBlockForm>) {
    setForm((prev) => {
      const parts = [...prev.parts]
      const blocks = [...parts[partIndex].stimulusBlocks]
      blocks[blockIndex] = { ...blocks[blockIndex], ...updates }
      parts[partIndex] = { ...parts[partIndex], stimulusBlocks: blocks }
      return { ...prev, parts }
    })
  }

  function handlePartImageUpload(partIndex: number, blockIndex: number, file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      updatePartStimulusBlock(partIndex, blockIndex, { imageData: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  // --- Render ---

  if (!paper) {
    return (
      <>
        <NavBar />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-lg text-muted-foreground">Paper not found.</p>
            <Button variant="ghost" onClick={() => navigate("/questions")}>
              <ArrowLeft className="mr-2 size-4" />
              Back to papers
            </Button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => navigate("/questions")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to papers
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{paper.title}</h1>
              <Badge variant="secondary">{paper.subject}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{paper.total_marks} marks</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">{paper.question_count} questions</span>
              {user && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setSettingsOpen(true)}>
                    <Settings className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div className="flex flex-col gap-4 pl-6">
          {paper.questions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
              <p className="text-muted-foreground">
                No questions yet. Add your first question.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={paper.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {paper.questions.map((q) => (
                  <SortableQuestionItem
                    key={q.id}
                    question={q}
                    canEdit={!!user}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    onExport={handleExportQuestion}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Add question */}
        <div className="mt-6">
          {user ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <div className="flex gap-2">
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 size-4" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <Button variant="outline" onClick={handleImportQuestions}>
                  <Upload className="mr-2 size-4" />
                  Import
                </Button>
              </div>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Question" : "Add Question"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? "Update the question details below."
                      : "Fill in the details to create a new question."}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  {/* Type */}
                  <div className="flex flex-col gap-2">
                    <Label>Type<span className="text-destructive"> *</span></Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => {
                        const newType = v as QuestionType
                        setForm((prev) => ({
                          ...prev,
                          type: newType,
                          marks: newType === "multiple_choice" ? 1 : prev.marks,
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                        <SelectItem value="long_answer">Long Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Marks — hidden for MCQ (always 1) */}
                  {form.type !== "multiple_choice" && (
                    <div className="flex flex-col gap-2">
                      <Label>Marks<span className="text-destructive"> *</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.marks}
                        onChange={(e) => updateFormField("marks", Number(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Stimulus blocks */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Stimulus</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addStimulusBlock("text")}
                        >
                          <Type data-icon="inline-start" />
                          Text
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addStimulusBlock("image")}
                        >
                          <Image data-icon="inline-start" />
                          Image
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addStimulusBlock("table")}
                        >
                          <Table data-icon="inline-start" />
                          Table
                        </Button>
                      </div>
                    </div>

                    {form.stimulusBlocks.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No stimulus. Add text, an image, or a table.
                      </p>
                    )}

                    {form.stimulusBlocks.map((block, i) => (
                      <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {block.kind === "text" && "Text"}
                            {block.kind === "image" && "Image"}
                            {block.kind === "table" && "Table"}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => removeStimulusBlock(i)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        {block.kind === "text" && (
                          <Textarea
                            placeholder="Stimulus text..."
                            value={block.text}
                            onChange={(e) => updateStimulusBlock(i, { text: e.target.value })}
                            rows={3}
                          />
                        )}

                        {block.kind === "image" && (
                          <div className="flex flex-col gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleImageUpload(i, file)
                              }}
                            />
                            {block.imageData && (
                              <img
                                src={block.imageData}
                                alt="Stimulus preview"
                                className="max-h-40 rounded-md object-contain"
                              />
                            )}
                          </div>
                        )}

                        {block.kind === "table" && (
                          <Textarea
                            placeholder={"| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |"}
                            value={block.text}
                            onChange={(e) => updateStimulusBlock(i, { text: e.target.value })}
                            rows={4}
                            className="font-mono text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-2">
                    <Label>
                      Question{form.type !== "long_answer" && <span className="text-destructive"> *</span>}
                    </Label>
                    <Textarea
                      placeholder="The question text..."
                      value={form.content}
                      onChange={(e) => updateFormField("content", e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Multiple choice options (dynamic) */}
                  {form.type === "multiple_choice" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <Label>Options<span className="text-destructive"> *</span></Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                          disabled={form.options.length >= 8}
                        >
                          <Plus data-icon="inline-start" />
                          Add Option
                        </Button>
                      </div>
                      {form.options.map((opt, i) => {
                        const label = String.fromCharCode(65 + i)
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex flex-col gap-2 rounded-lg border p-3",
                              form.answer === label && "border-emerald-500/50 bg-emerald-500/5"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                className={cn(
                                  "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-sm font-medium transition-colors",
                                  form.answer === label
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => updateFormField("answer", form.answer === label ? "" : label)}
                                title={form.answer === label ? "Unmark as correct" : "Mark as correct answer"}
                              >
                                {label}.
                                {form.answer === label && (
                                  <span className="text-xs">Correct Answer</span>
                                )}
                              </button>
                              {form.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={() => removeOption(i)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                            <Input
                              placeholder={`Option ${label} text (paste image with Ctrl+V)`}
                              value={opt.text}
                              onChange={(e) => updateOption(i, { text: e.target.value })}
                              onPaste={(e) => {
                                const items = e.clipboardData?.items
                                if (!items) return
                                for (const item of items) {
                                  if (item.type.startsWith("image/")) {
                                    e.preventDefault()
                                    const file = item.getAsFile()
                                    if (file) handleOptionImageUpload(i, file)
                                    return
                                  }
                                }
                              }}
                            />
                            <div className="flex flex-col gap-1">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleOptionImageUpload(i, file)
                                }}
                              />
                              {opt.imageData && (
                                <div className="relative">
                                  <img
                                    src={opt.imageData}
                                    alt={`Option ${label}`}
                                    className="max-h-24 rounded-md object-contain"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 size-6 bg-background/80 text-destructive hover:text-destructive"
                                    onClick={() => updateOption(i, { imageData: "" })}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <p className="text-xs text-muted-foreground">
                        Minimum 2 options. Currently {form.options.length}. Click a label to mark the correct answer.
                      </p>
                    </div>
                  )}

                  {/* Long answer parts */}
                  {form.type === "long_answer" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <Label>Parts<span className="text-destructive"> *</span></Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPart}
                        >
                          <Plus data-icon="inline-start" />
                          Add Part
                        </Button>
                      </div>
                      {form.parts.map((part, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-3 rounded-lg border p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Part ({String.fromCharCode(97 + i)})
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => removePart(i)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>

                          {/* Part stimulus */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Stimulus</Label>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => addPartStimulusBlock(i, "text")}
                                >
                                  <Type className="size-3 mr-1" />
                                  Text
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => addPartStimulusBlock(i, "image")}
                                >
                                  <Image className="size-3 mr-1" />
                                  Image
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => addPartStimulusBlock(i, "table")}
                                >
                                  <Table className="size-3 mr-1" />
                                  Table
                                </Button>
                              </div>
                            </div>
                            {part.stimulusBlocks.map((block, bi) => (
                              <div key={bi} className="flex flex-col gap-1 rounded border p-2 bg-muted/30">
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {block.kind}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-5 text-destructive hover:text-destructive"
                                    onClick={() => removePartStimulusBlock(i, bi)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                                {block.kind === "text" && (
                                  <Textarea
                                    placeholder="Stimulus text..."
                                    value={block.text}
                                    onChange={(e) => updatePartStimulusBlock(i, bi, { text: e.target.value })}
                                    rows={2}
                                    className="text-xs"
                                  />
                                )}
                                {block.kind === "image" && (
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      className="text-xs"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handlePartImageUpload(i, bi, file)
                                      }}
                                    />
                                    {block.imageData && (
                                      <img
                                        src={block.imageData}
                                        alt="Stimulus preview"
                                        className="max-h-24 rounded-md object-contain"
                                      />
                                    )}
                                  </div>
                                )}
                                {block.kind === "table" && (
                                  <Textarea
                                    placeholder={"| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |"}
                                    value={block.text}
                                    onChange={(e) => updatePartStimulusBlock(i, bi, { text: e.target.value })}
                                    rows={3}
                                    className="font-mono text-[10px]"
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Part question content */}
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs">Question<span className="text-destructive"> *</span></Label>
                            <Textarea
                              placeholder="Part question text..."
                              value={part.content}
                              onChange={(e) => updatePart(i, "content", e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Marks:</Label>
                            <Input
                              type="number"
                              min={0}
                              className="w-20"
                              value={part.marks}
                              onChange={(e) =>
                                updatePart(i, "marks", Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                      ))}
                      {form.parts.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No parts added yet.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Topics */}
                  <div className="flex flex-col gap-2">
                    <Label>Topics (comma-separated)</Label>
                    <Input
                      placeholder="e.g. algebra, quadratics"
                      value={form.topics}
                      onChange={(e) => updateFormField("topics", e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={
                    form.type === "long_answer"
                      ? form.parts.length === 0
                      : !form.content.trim()
                  }>
                    {editingId ? "Save Changes" : "Add Question"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <AuthPrompt
              title="Sign in to add questions"
              description="You need to be signed in to create and edit questions."
            />
          )}
        </div>
      </main>
      {paper && (
        <PaperSettingsDialog
          paper={paper}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={refreshPaper}
        />
      )}
    </>
  )
}
