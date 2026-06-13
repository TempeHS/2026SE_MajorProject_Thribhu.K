import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { paperStore } from "@/lib/paper";

declare global {
    interface Window {
        exportPaper?: (id: string) => Promise<void>;
    }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Allows for exporting a published paper.
 * 
 * Use `exportPaper("uuid")` in the console
 */
window.exportPaper = async (id: string) => {
    const paper = await paperStore.getPaper(id);
    if (!paper) {
        console.error(`Paper "${id}" not found in local store.`);
        return;
    }

    // resolve asset:// to base64
    async function blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }

    for (const q of paper.questions) {
        const blockArrays = [q.stimulus, q.content, ...(q.parts?.map(p => p.content) ?? []), ...(q.parts?.map(p => p.stimulus).filter(Boolean) ?? [])];
        for (const blocks of blockArrays) {
            if (!blocks) continue;
            for (const block of blocks) {
                if (block.kind === "image" && block.url.startsWith("asset://")) {
                    const asset = await paperStore.getAsset(block.url.slice(8));
                    if (asset) {
                        block.url = await blobToDataUrl(asset.blob);
                    }
                }
            }
        }
        if (q.options) {
            for (const opt of q.options) {
                for (const block of opt.content) {
                    if (block.kind === "image" && block.url.startsWith("asset://")) {
                        const asset = await paperStore.getAsset(block.url.slice(8));
                        if (asset) {
                            block.url = await blobToDataUrl(asset.blob);
                        }
                    }
                }
            }
        }
    }

    const json = JSON.stringify(paper, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paper.title.replace(/[^a-z0-9]/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`Exported "${paper.title}" (${paper.questions.length} questions)`);
};
