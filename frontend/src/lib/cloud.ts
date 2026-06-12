import type { Paper } from "@/types/tppr-paper";
import { paperStore } from "./paper";

export async function syncPaper(paper: Paper): Promise<void> {
    await paperStore.savePaper(paper);
    // TODO: implement cloud syncing
}