import { Check, Image, UploadSimple, X } from "@phosphor-icons/react";
import { useRef, useState, type ChangeEvent } from "react";
import { apiRequest } from "../api";
import type { Task, TaskImage } from "../types";
import { message } from "../use-resource";
export function TaskCard({ task, date, onChange, readOnly = false }: {
    task: Task;
    date?: string;
    onChange?: () => void;
    readOnly?: boolean;
}) {
    const [images, setImages] = useState<TaskImage[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const input = useRef<HTMLInputElement>(null);
    const upload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length)
            return;
        setError("");
        if (images.length + files.length > 3) {
            setError("每次打卡最多 3 张图片。");
            return;
        }
        if (files.some(file => file.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
            setError("请选择不超过 4MB 的 JPG、PNG 或 WebP 图片。");
            return;
        }
        setBusy(true);
        try {
            for (const file of files) {
                const form = new FormData();
                form.append("file", file);
                const result = await apiRequest<{
                    asset: TaskImage;
                }>("/api/assets/upload", { method: "POST", body: form });
                setImages(current => [...current, result.asset]);
            }
        }
        catch (cause) {
            setError(message(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const submit = async () => {
        setBusy(true);
        setError("");
        try {
            await apiRequest(`/api/tasks/${task.id}/checkin`, { method: task.checkinId ? "DELETE" : "POST", body: JSON.stringify({ date, imageIds: images.map(image => image.id) }) });
            setImages([]);
            onChange?.();
        }
        catch (cause) {
            setError(message(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const shownImages = task.checkinId ? task.images : images;
    return <article className={`task-row ${task.checkinId ? "is-complete" : ""}`}>
    <span className="task-indicator" aria-hidden="true">{task.checkinId ? <Check weight="thin"/> : <span />}</span>
    <div className="task-body"><div className="task-title"><h2>{task.title}</h2><span className={`status-tag ${task.checkinId ? "success" : ""}`}>{task.checkinId ? "已完成" : task.imagePolicy === "required" ? "需上传图片" : task.imagePolicy === "optional" ? "图片选填" : "一键打卡"}</span></div>
      {task.description && <p>{task.description}</p>}
      {shownImages.length > 0 && <div className="image-strip">{shownImages.map(image => <div className="image-thumb" key={image.id}><a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`${task.title}的打卡图片`} loading="lazy"/></a>{!task.checkinId && !readOnly && <button disabled={busy} aria-label="移除图片" className="image-remove" onClick={() => setImages(current => current.filter(item => item.id !== image.id))}><X /></button>}</div>)}</div>}
      {!readOnly && !task.checkinId && task.imagePolicy !== "none" && <div className="upload-control"><input type="file" ref={input} accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event => void upload(event)}/><button className="secondary-button small" disabled={busy || images.length >= 3} onClick={() => input.current?.click()}><UploadSimple />{busy ? "处理中…" : "上传图片"}</button><span><Image /> {images.length}/3 · 每张不超过 4MB</span></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    {!readOnly && <button className={task.checkinId ? "text-button undo-button" : "primary-button checkin-button"} disabled={busy || (!task.checkinId && task.imagePolicy === "required" && !images.length)} onClick={() => void submit()}>{busy ? "处理中…" : task.checkinId ? "撤销" : "完成打卡"}</button>}
  </article>;
}
