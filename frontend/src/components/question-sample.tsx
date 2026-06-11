import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getPaper } from "@/api/papers";
import { paperStore } from "@/lib/paper";
import type { Paper, Question } from "@/types/tppr-paper";

export function QuestionSample({ paperId }: { paperId: string }) {
    const [question, setQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const paper: Paper | undefined =
                    (await paperStore.getPaper(paperId).catch(() =>
                        undefined
                    )) ??
                        (await getPaper(paperId).catch(() => undefined));

                const questions = paper?.questions ?? [];
                setQuestion(
                    questions.length > 0
                        ? questions[
                            Math.floor(Math.random() * questions.length)
                        ]
                        : null,
                );
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [paperId]);

    if (loading) {
        return (
            <p className="text-sm text-muted-foreground">Loading preview…</p>
        );  
    }

    if (!question) {
        return (
            <p className="text-sm text-muted-foreground">
                No questions in this paper yet.
            </p>
        );
    }

    const previewText =
        question.content?.find((b) => b.kind === "text")?.text ??
            "No text preview available";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                    Question {question.number}
                </span>
                <div className="flex gap-1">
                    {question.difficulty && (
                        <Badge variant="outline">{question.difficulty}</Badge>
                    )}
                    <Badge variant="secondary">{question.marks} marks</Badge>
                </div>
            </div>
            <p className="line-clamp-5 text-sm text-muted-foreground">
                {previewText}
            </p>
        </div>
    );
}
