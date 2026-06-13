import Markdown from "react-markdown";
import NavBar from "@/components/navbar";
import { Scale } from "lucide-react";
import content from "@/../../docs/COPYRIGHT.md?raw";
import remarkGfm from "remark-gfm";

export default function Copyright() {
    return (
        <>
            <NavBar />
            <main className="mx-auto w-full max-w-3xl px-6 py-12">
                <div className="mb-8 flex items-center gap-3 border-b pb-6">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Scale className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Copyright</h1>
                        <p className="text-sm text-muted-foreground">
                            Legal considerations for content on tppr
                        </p>
                    </div>
                </div>
                <article className="prose dark:prose-invert prose-headings:font-semibold prose-h2:mt-8 prose-h2:border-b prose-h2:pb-2 prose-li:marker:text-muted-foreground">
                    <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                </article>
                <footer className="mt-12 border-t pt-4 text-xs text-muted-foreground">
                    Last updated: June 2026
                </footer>
            </main>
        </>
    );
}