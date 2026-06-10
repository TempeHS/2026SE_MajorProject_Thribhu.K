import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updatePaper } from "@/lib/paper-storage"
import type { PaperMeta, PaperSource, CourseLevel } from "@/types/paper"

export interface PaperSettingsDialogProps {
  paper: PaperMeta
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function PaperSettingsDialog({
  paper,
  open,
  onOpenChange,
  onSaved,
}: PaperSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {open && (
          <PaperSettingsForm paper={paper} onClose={() => onOpenChange(false)} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  )
}

const NONE = "__none__"

function PaperSettingsForm({
  paper,
  onClose,
  onSaved,
}: {
  paper: PaperMeta
  onClose: () => void
  onSaved?: () => void
}) {
  const [title, setTitle] = useState(paper.title)
  const [subject, setSubject] = useState(paper.subject)
  const [year, setYear] = useState<number | "">(paper.year ?? "")
  const [source, setSource] = useState<PaperSource | "">(paper.source ?? "")
  const [school, setSchool] = useState(paper.school ?? "")
  const [courseLevel, setCourseLevel] = useState<CourseLevel | "">(paper.course_level ?? "")

  const [outcomes, setOutcomes] = useState(paper.outcomes?.join(", ") ?? "")
  const [visibility, setVisibility] = useState(paper.visibility)
  const [duration, setDuration] = useState<number | "">(paper.duration_minutes ?? "")

  function handleSave() {
    if (!title.trim() || !subject.trim()) return

    const outcomesList = outcomes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    updatePaper(paper.id, {
      title: title.trim(),
      subject: subject.trim(),
      year: year ? Number(year) : undefined,
      source: source || undefined,
      school: school.trim() || undefined,
      course_level: courseLevel || undefined,

      outcomes: outcomesList.length > 0 ? outcomesList : undefined,
      visibility,
      duration_minutes: duration ? Number(duration) : undefined,
    })

    onClose()
    onSaved?.()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Paper Settings</DialogTitle>
        <DialogDescription>
          Edit the paper metadata below.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="settings-title">
            Title<span className="text-destructive"> *</span>
          </Label>
          <Input
            id="settings-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {(() => {
          const showLevel = /^(math|maths|mathematics|english)$/i.test(subject.trim())
          return (
            <div className={showLevel ? "grid grid-cols-2 gap-4" : "grid gap-2"}>
              <div className="grid gap-2">
                <Label htmlFor="settings-subject">
                  Subject<span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="settings-subject"
                  placeholder="e.g. Physics, Mathematics, English"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              {showLevel && (
                <div className="grid gap-2">
                  <Label htmlFor="settings-course-level">Course Level</Label>
                  <Select
                    value={courseLevel || NONE}
                    onValueChange={(v) => setCourseLevel(v === NONE ? "" : v as CourseLevel)}
                  >
                    <SelectTrigger id="settings-course-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="extension_1">Extension 1</SelectItem>
                      <SelectItem value="extension_2">Extension 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )
        })()}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-year">Year</Label>
            <Input
              id="settings-year"
              type="number"
              min={2000}
              max={2099}
              placeholder="e.g. 2024"
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-source">Source</Label>
            <Select
              value={source || NONE}
              onValueChange={(v) => setSource(v === NONE ? "" : v as PaperSource)}
            >
              <SelectTrigger id="settings-source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                <SelectItem value="hsc">HSC</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settings-school">School</Label>
          <Input
            id="settings-school"
            placeholder="e.g. James Ruse, Sydney Grammar"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settings-outcomes">Outcomes (comma-separated)</Label>
          <Input
            id="settings-outcomes"
            placeholder="e.g. ME12-1, ME12-3, ME12-7"
            value={outcomes}
            onChange={(e) => setOutcomes(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-duration">Duration (minutes)</Label>
            <Input
              id="settings-duration"
              type="number"
              min={1}
              placeholder="e.g. 120"
              value={duration}
              onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as "private" | "public")}
            >
              <SelectTrigger id="settings-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!title.trim() || !subject.trim()}>
          Save
        </Button>
      </DialogFooter>
    </>
  )
}
