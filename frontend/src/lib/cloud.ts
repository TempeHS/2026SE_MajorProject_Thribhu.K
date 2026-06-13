import type { Paper } from "@/types/tppr-paper";
import { paperStore } from "./paper";

export type ConnStatus = "online" | "offline";

export class SyncService {
    private timeout: ReturnType<typeof setTimeout> | null = null;
    private pending: Paper | null = null;
    private status: ConnStatus = "online";
    private listeners = new Set<(s: ConnStatus) => void>();

    getStatus() { return this.status; }

    subscribe(fn: (s: ConnStatus) => void) {
        this.listeners.add(fn);
        return () => { this.listeners.delete(fn); };
    }

    private setStatus(s: ConnStatus) {
        if (s === this.status) return;
        this.status = s;
        this.listeners.forEach((fn) => fn(s));
    }

    private async pushToServer(paper: Paper): Promise<void> {
        const res = await fetch(`/api/papers/${paper.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(paper),
        });

        if (res.status === 404) {
            const createRes = await fetch("/api/papers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(paper),
            });
            if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
        } else if (!res.ok) {
            throw new Error(`Sync failed: ${res.status}`);
        }
        this.setStatus("online");
    }

    async sync(paper: Paper): Promise<void> {
        await paperStore.savePaper(paper);
        this.pending = paper;

        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(async () => {
            if (!this.pending) return;
            try {
                await this.pushToServer(this.pending);
            } catch (e) {
                console.warn(e);
                this.setStatus("offline");
            }
            this.pending = null;
        }, 1500);
    }

    async flush(): Promise<void> {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        if (this.pending) {
            try {
                await this.pushToServer(this.pending);
            } catch {
                this.setStatus("offline");
            }
            this.pending = null;
        }
    }

    async publish(paperId: string): Promise<void> {
        const paper = await paperStore.getPaper(paperId);
        if (!paper) throw new Error("Paper not found locally");

        const res = await fetch(`/api/papers/${paperId}/publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(paper),
        });
        if (!res.ok) throw new Error(`Publish failed: ${res.status}`);
        this.setStatus("online");
    }

    async unpublish(paperId: string): Promise<void> {
        const res = await fetch(`/api/papers/${paperId}/publish`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) throw new Error(`Unpublish failed: ${res.status}`);
        this.setStatus("online");
    }
}

export const syncService = new SyncService();