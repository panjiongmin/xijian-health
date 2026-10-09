import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "./api";
export function useResource<T>(path: string) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const previousPath = useRef("");
    const reload = useCallback(() => setRevision(value => value + 1), []);
    useEffect(() => {
        const controller = new AbortController();
        if (previousPath.current !== path) {
            setLoading(true);
            setData(null);
            previousPath.current = path;
        }
        setError("");
        apiRequest<T>(path, { signal: controller.signal }).then(setData).catch(cause => { if (!controller.signal.aborted)
            setError(cause instanceof Error ? cause.message : "加载失败，请重试。"); }).finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [path, revision]);
    return { data, error, loading, reload };
}
export function dateInBeijing() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function message(cause: unknown) { return cause instanceof Error ? cause.message : "操作失败，请稍后重试。"; }
