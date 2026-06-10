import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getPaper } from "@/api/papers";
import type { Paper } from "@/types/tppr-paper";

export function QuestionSample({ paperId }: { paperId: string }) {
    const [paper, setPaper] = useState<Paper | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPaper(paperId)
            .then(setPaper)
            .catch(() => setPaper(null))
            .finally(() => setLoading(false));
    }, [paperId]);

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading preview…</p>;
    }

    const question = paper?.questions?.[0];
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