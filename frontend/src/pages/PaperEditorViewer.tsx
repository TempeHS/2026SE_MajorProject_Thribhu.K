import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "@/components/navbar";
import { PaperCard } from "@/components/paper-card";
import { getPapers, deletePaper } from "@/api/papers";
import { FileQuestion } from "lucide-react";
import { toast } from "sonner";
import type { PaperMeta } from "@/types/tppr-paper";

export function PapersViewer() {
    const [papers, setPapers] = useState<PaperMeta[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        getPapers()
            .then(setPapers)
            .catch(() => setPapers([]));
    }, []);

    async function handleDelete(id: string) {
        try {
            await deletePaper(id);
            setPapers((prev) => prev.filter((p) => p.id !== id));
            toast.success("Paper deleted");
        } catch {
            toast.error("Failed to delete paper");
        }
    }

    return (
        <>
            <NavBar />
            <main className="mx-auto w-full max-w-6xl px-6 py-8">
                <h1 className="mb-6 text-2xl font-bold">My Papers</h1>

                {papers.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-24 text-muted-foreground">
                        <FileQuestion className="size-10" />
                        <p>No papers yet. Create one from the navbar!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {papers.map((paper) => (
                            <PaperCard
                                key={paper.id}
                                paper={paper}
                                onOpen={() => navigate(`/papers/${paper.id}`)}
                                onEdit={() =>
                                    navigate(`/papers/${paper.id}?settings=true`)}
                                onDelete={() => handleDelete(paper.id)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}