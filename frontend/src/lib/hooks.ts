import { useEffect, useState } from "react";
import { syncService } from "@/lib/cloud";

export function useOnline() {
    const [online, setOnline] = useState(() => syncService.getStatus() === "online");
    useEffect(() => syncService.subscribe((s) => setOnline(s === "online")), []);
    return online;
}