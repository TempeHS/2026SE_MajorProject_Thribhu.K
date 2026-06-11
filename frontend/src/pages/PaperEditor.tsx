import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    createQuestion,
    paperStore,
    withRecalculatedTotals,
} from "@/lib/paper";
import type { Paper, Question as QuestionData } from "@/types/tppr-paper";
import NavBar from "@/components/navbar";
import { Question } from "@/components/question";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { QuestionEditor } from "@/components/question-editor";

export default function PaperEditor() {
    const { id } = useParams<{ id: string }>();
    const [paper, setPaper] = useState<Paper | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = paper?.questions.find((q) => q.id === selectedId) ?? null;

    useEffect(() => {
        if (!id) return;
        paperStore
            .getPaper(id)
            .then((p) => setPaper(p ?? null))
            .finally(() => setLoading(false));
    }, [id]);

    async function updatePaper(next: Paper) {
        const stamped = withRecalculatedTotals(next);
        setPaper(stamped);
        await paperStore.savePaper(stamped);
    }

    function addQuestion() {
        if (!paper) return;
        updatePaper({
            ...paper,
            questions: [...paper.questions, createQuestion(paper)],
        });
    }

    function handleQuestionChange(updated: QuestionData) {
        if (!paper) return;
        updatePaper({
            ...paper,
            questions: paper.questions.map((q) =>
                q.id === updated.id ? updated : q
            ),
        });
    }

    function handleQuestionDelete(qid: string) {
        if (!paper) return;
        updatePaper({
            ...paper,
            questions: paper.questions
                .filter((q) => q.id !== qid)
                .map((q, i) => ({ ...q, number: i + 1 })),
        });
    }

    if (loading) {
        return (
            <>
                <NavBar />
                <p className="py-24 text-center text-muted-foreground">
                    Loading…
                </p>
            </>
        );
    }

    if (!paper) {
        return (
            <>
                <NavBar />
                <p className="py-24 text-center text-muted-foreground">
                    Paper not found.
                </p>
            </>
        );
    }

    return (
        <>
            <NavBar />
            <main className="mx-auto w-full max-w-3xl px-6 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{paper.title}</h1>
                    <span className="text-sm text-muted-foreground">
                        {paper.question_count} question
                        {paper.question_count === 1 ? "" : "s"} ·{" "}
                        {paper.total_marks} mark
                        {paper.total_marks === 1 ? "" : "s"}
                    </span>
                </div>

                {paper.questions.length === 0
                    ? (
                        <p className="text-muted-foreground">
                            No questions yet.
                        </p>
                    )
                    : (
                        <div className="space-y-4">
                            {paper.questions.map((q) => (
                                <Question
                                    key={q.id}
                                    question={q}
                                    onChange={handleQuestionChange}
                                    onDelete={() => handleQuestionDelete(q.id)}
                                />
                            ))}
                        </div>
                    )}

                <Button onClick={addQuestion} className="mt-6">
                    <Plus /> Add question
                </Button>
            </main>

            <Sheet
                open={selected !== null}
                onOpenChange={(open) => !open && setSelectedId(null)}
            >
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                    {selected && (
                        <>
                            <SheetHeader>
                                <SheetTitle>
                                    Edit Question {selected.number}
                                </SheetTitle>
                            </SheetHeader>
                            <QuestionEditor
                                question={selected}
                                onChange={handleQuestionChange}
                            />
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}