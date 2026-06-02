import { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import NavBar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listPapers, createPaper, deletePaper, getPaper, importPaper } from "@/lib/paper-storage"
import { useAuth } from "@/api/auth"
import { AuthPrompt } from "@/components/auth-prompt"
import type { PaperMeta, Paper } from "@/types/paper"
import { Plus, Trash2, FileText, Clock, Settings, Download } from "lucide-react"
import { PaperSettingsDialog } from "@/components/paper-settings-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function Papers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [papers, setPapers] = useState<PaperMeta[]>(listPapers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsPaper, setSettingsPaper] = useState<PaperMeta | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (searchParams.get("new") === "true" && user) {
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, user, setSearchParams])
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [visibility, setVisibility] = useState<"private" | "public">("private")

  function refresh() {
    setPapers(listPapers())
  }

  function handleCreate() {
    if (!title.trim() || !subject.trim()) return

    const now = new Date().toISOString()
    createPaper({
      id: crypto.randomUUID(),
      title: title.trim(),
      subject: subject.trim(),
      author_id: String(user!.user_id),
      visibility,
      question_count: 0,
      total_marks: 0,
      questions: [],
      created_at: now,
      updated_at: now,
    })

    setTitle("")
    setSubject("")
    setVisibility("private")
    setDialogOpen(false)
    refresh()
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deletePaper(id)
    refresh()
  }

  function handleExport(e: React.MouseEvent, paperId: string) {
    e.stopPropagation()
    const paper = getPaper(paperId)
    if (!paper) return
    const blob = new Blob([JSON.stringify(paper, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${paper.title.replace(/[^a-zA-Z0-9]/g, "_")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Paper
        if (!data.title || !data.subject || !Array.isArray(data.questions)) {
          toast.error("Invalid paper JSON file")
          return
        }
        importPaper(data, String(user?.user_id ?? ""))
        refresh()
        toast.success(`Imported "${data.title}"`)
      } catch {
        toast.error("Failed to parse JSON file")
      }
    }
    reader.readAsText(file)
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/json" || f.name.endsWith(".json")
    )
    for (const file of files) {
      handleImportFile(file)
    }
  }

  return (
    <>
      <NavBar />
      <main
        className={cn("mx-auto max-w-4xl px-6 py-8 min-h-[calc(100vh-4rem)] transition-colors", isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary/20 rounded-lg")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/60">
            <div className="rounded-xl border-2 border-dashed border-primary p-8 text-center">
              <FileText className="mx-auto size-12 text-primary" />
              <p className="mt-2 text-lg font-medium text-primary">Drop paper JSON to import</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Papers</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {!user ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button disabled>
                      <Plus className="mr-2 size-4" />
                      New Paper
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Sign in to create a paper
                </TooltipContent>
              </Tooltip>
            ) : (
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  New Paper
                </Button>
              </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Paper</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create a new paper.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Physics Mid-Term 2025"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Physics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as "private" | "public")}
                  >
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {papers.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <FileText className="size-12 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">No papers yet</h2>
              <p className="text-sm text-muted-foreground">
                Create your first paper to get started.
              </p>
            </div>
            {user ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                New Paper
              </Button>
            ) : (
              <AuthPrompt
                title="Sign in to create papers"
                description="Create and manage your own question papers."
              />
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {papers.map((paper) => (
              <Card
                key={paper.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/questions/${paper.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{paper.title}</CardTitle>
                    <Badge variant={paper.visibility === "public" ? "default" : "secondary"}>
                      {paper.visibility}
                    </Badge>
                  </div>
                  <CardDescription>{paper.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3.5" />
                      {paper.question_count} questions
                    </span>
                    <span>{paper.total_marks} marks</span>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {new Date(paper.updated_at).toLocaleDateString()}
                  </span>
                  {user && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSettingsPaper(paper)
                        }}
                      >
                        <Settings className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => handleExport(e, paper.id)}
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDelete(e, paper.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        {settingsPaper && (
          <PaperSettingsDialog
            paper={settingsPaper}
            open={!!settingsPaper}
            onOpenChange={(open) => { if (!open) setSettingsPaper(null) }}
            onSaved={refresh}
          />
        )}
      </main>
    </>
  )
}
