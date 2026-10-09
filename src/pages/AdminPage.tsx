import { PencilSimple, Plus, Check, UsersThree, Bell, ListChecks } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../api";
import { Feedback } from "../components/Feedback";
import type { ManagedTask, Member, ReminderConfig, Task } from "../types";
import { dateInBeijing, message, useResource } from "../use-resource";
const weekdays = [{ value: 1, label: "周一" }, { value: 2, label: "周二" }, { value: 3, label: "周三" }, { value: 4, label: "周四" }, { value: 5, label: "周五" }, { value: 6, label: "周六" }, { value: 0, label: "周日" }];
const imageLabels = { none: "不需要图片", optional: "图片选填", required: "必须上传图片" };
const deliveryLabels: Record<string, string> = { processing: "处理中", queued: "等待投递", sent: "已发送", failed: "发送失败" };
const emptyForm = { title: "", description: "", weekdays: [0, 1, 2, 3, 4, 5, 6], imagePolicy: "none" as Task["imagePolicy"], active: true };
function TaskManager() {
    const resource = useResource<{
        tasks: ManagedTask[];
    }>("/api/admin/tasks");
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const edit = (task: ManagedTask) => { setForm({ title: task.title, description: task.description, weekdays: weekdays.filter(day => task.weekdayMask & (1 << day.value)).map(day => day.value), imagePolicy: task.imagePolicy, active: Boolean(task.active) }); setEditing(task.id); setOpen(true); setError(""); setSuccess(""); };
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setSuccess("");
        try {
            await apiRequest(editing ? `/api/admin/tasks/${editing}` : "/api/admin/tasks", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
            setSuccess(editing ? "任务已保存，调整从明天生效。" : "任务已创建，今天开始生效。");
            setOpen(false);
            setEditing(null);
            setForm(emptyForm);
            resource.reload();
        }
        catch (cause) {
            setError(message(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const toggle = async (task: ManagedTask) => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
            await apiRequest(`/api/admin/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ title: task.title, description: task.description, weekdays: weekdays.filter(day => task.weekdayMask & (1 << day.value)).map(day => day.value), imagePolicy: task.imagePolicy, active: !task.active }) });
            setSuccess(task.active ? "任务已停用，明天起不再安排。" : "任务已启用，明天起开始安排。");
            resource.reload();
        }
        catch (cause) {
            setError(message(cause));
        }
        finally {
            setBusy(false);
        }
    };
    return <section><div className="section-toolbar"><div><h2>团队任务</h2><p className="muted">新任务今天生效；编辑与启停从明天生效。</p></div><button className="primary-button" disabled={busy} onClick={() => { setForm(emptyForm); setEditing(null); setOpen(true); setError(""); setSuccess(""); }}><Plus />新建任务</button></div>
    {open && <form className="task-form" onSubmit={event => void submit(event)}><div className="section-toolbar"><h3>{editing ? "编辑任务" : "新建任务"}</h3><button type="button" className="text-button" disabled={busy} onClick={() => setOpen(false)}>取消</button></div>
      <label>任务名称<input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} maxLength={60} placeholder="例如：阅读 20 分钟" required/></label>
      <label>任务说明<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} maxLength={300} placeholder="写清楚完成标准（选填）" rows={3}/></label>
      <fieldset><legend>重复日期</legend><div className="weekday-options">{weekdays.map(day => <label key={day.value}><input type="checkbox" checked={form.weekdays.includes(day.value)} onChange={event => setForm({ ...form, weekdays: event.target.checked ? [...form.weekdays, day.value] : form.weekdays.filter(value => value !== day.value) })}/>{day.label}</label>)}</div>{!form.weekdays.length && <p className="form-error">请至少选择一天。</p>}</fieldset>
      <div className="form-columns"><label>图片要求<select value={form.imagePolicy} onChange={event => setForm({ ...form, imagePolicy: event.target.value as Task["imagePolicy"] })}>{Object.entries(imageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })}/>启用任务</label></div>
      {error && <p role="alert" className="form-error">{error}</p>}<button className="primary-button" disabled={busy || !form.weekdays.length}><Check />{busy ? "正在保存…" : "保存任务"}</button>
    </form>}
    {!open && error && <p className="form-error" role="alert">{error}</p>}{success && <p className="success-notice" role="status">{success}</p>}
    <Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && (resource.data.tasks.length ? <div className="managed-task-list">{resource.data.tasks.map(task => <article className="managed-task" key={task.id}><div><div className="task-title"><h3>{task.title}</h3><span className={`status-tag ${task.active ? "success" : ""}`}>{task.active ? "已启用" : "已停用"}</span></div>{task.description && <p className="muted">{task.description}</p>}<div className="task-meta">{task.weekdayMask === 127 ? "每天" : weekdays.filter(day => task.weekdayMask & (1 << day.value)).map(day => day.label).join("、")}<span>·</span>{imageLabels[task.imagePolicy]}</div></div><div className="row-actions"><button className="secondary-button small" disabled={busy} onClick={() => edit(task)}><PencilSimple />编辑</button><button className="text-button" disabled={busy} onClick={() => void toggle(task)}>{task.active ? "停用" : "启用"}</button></div></article>)}</div> : <div className="empty-state"><ListChecks /><h3>还没有团队任务</h3><p>先创建一项任务，成员就可以开始打卡。</p></div>)}
  </section>;
}
function MemberOverview() {
    const [date, setDate] = useState(dateInBeijing);
    const resource = useResource<{
        date: string;
        tasks: Task[];
        members: Member[];
    }>(`/api/admin/overview?date=${date}`);
    const complete = resource.data?.members.filter(member => member.tasks.length > 0 && member.tasks.every(task => task.checkinId)).length || 0;
    return <section><div className="section-toolbar"><div><h2>成员完成情况</h2><p className="muted">查看当天进度和打卡图片。</p></div><label className="date-filter">日期<input type="date" value={date} max={dateInBeijing()} onChange={event => { if (event.target.value)
        setDate(event.target.value); }}/></label></div><Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && <><div className="overview-summary"><span>{resource.data.members.length} 位成员</span><span>{resource.data.tasks.length} 项任务</span><span>{complete} 位全部完成</span><button className="text-button" onClick={resource.reload}>刷新</button></div>
      {!resource.data.members.length && <div className="empty-state"><UsersThree /><h3>这一天还没有成员</h3><p>成员注册后，会在对应日期显示。</p></div>}
      <div className="member-list">{resource.data.members.map(member => <article className="member-row" key={member.id}><div className="member-heading"><span className="avatar">{member.displayName.slice(0, 1)}</span><div><h3>{member.displayName}</h3><p>{member.email}</p></div><strong>{member.tasks.filter(task => task.checkinId).length}/{member.tasks.length}</strong>{member.reminder && <span className={`status-tag ${member.reminder.status === "failed" ? "error" : ""}`} title={member.reminder.errorCode || undefined}>提醒：{deliveryLabels[member.reminder.status] || member.reminder.status}</span>}</div>
        <div className="member-tasks">{member.tasks.map(task => <div className="member-task" key={task.id}><span className={task.checkinId ? "done-label" : "muted"}>{task.checkinId ? <Check weight="bold"/> : <span className="pending-dot"/>}{task.title}</span><span className="muted">{task.checkinId ? "已完成" : "未完成"}</span>{task.images.length > 0 && <div className="image-strip">{task.images.map(image => <a key={image.id} className="image-thumb" href={image.url} target="_blank" rel="noreferrer"><img loading="lazy" src={image.url} alt={`${member.displayName}的${task.title}打卡图片`}/></a>)}</div>}</div>)}</div>
      </article>)}</div>
    </>}
  </section>;
}
function ReminderManager() {
    const resource = useResource<ReminderConfig>("/api/admin/reminders");
    const [form, setForm] = useState({ enabled: false, reminderTime: "20:07", siteUrl: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    useEffect(() => { if (resource.data)
        setForm({ enabled: resource.data.enabled, reminderTime: resource.data.reminderTime, siteUrl: resource.data.siteUrl }); }, [resource.data]);
    const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); setSuccess(""); try {
        await apiRequest("/api/admin/reminders", { method: "PUT", body: JSON.stringify(form) });
        setSuccess("提醒设置已保存。");
        resource.reload();
    }
    catch (cause) {
        setError(message(cause));
    }
    finally {
        setBusy(false);
    } };
    return <section><div className="section-toolbar"><div><h2>微信提醒</h2><p className="muted">每日提醒未完成且已绑定的成员，每人每天最多一次。</p></div></div><Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && <><div className="provider-status">{[{ key: "token" as const, label: "pushplus Token" }, { key: "secretKey" as const, label: "pushplus SecretKey" }, { key: "callbackSecret" as const, label: "回调密钥" }].map(item => <div key={item.key}><span>{item.label}</span><span className={`status-tag ${resource.data?.configured[item.key] ? "success" : ""}`}>{resource.data?.configured[item.key] ? "已配置" : "未配置"}</span></div>)}</div>
      {!Object.values(resource.data.configured).every(Boolean) && <p className="notice">微信提醒尚未就绪。补齐 pushplus 配置后，成员才能扫码绑定。</p>}
      <form className="settings-form" onSubmit={event => void submit(event)}><label>提醒时间（北京时间）<input type="time" value={form.reminderTime} onChange={event => setForm({ ...form, reminderTime: event.target.value })} required/></label><label>打卡网站公开地址<input type="url" value={form.siteUrl} onChange={event => setForm({ ...form, siteUrl: event.target.value })} placeholder="https://你的打卡域名"/><small>用于手机打开打卡页及接收绑定、投递结果回调。</small></label><label className="checkbox-field"><input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })}/>开启每日自动提醒</label>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="success-notice" role="status">{success}</p>}<button className="primary-button" disabled={busy}>{busy ? "正在保存…" : "保存提醒设置"}</button></form>
      {resource.data.callbackUrl && <div className="callback-setting"><h3>pushplus 回调地址</h3><p className="muted">将此地址填入 pushplus 的“功能设置 → 回调地址”，用于扫码绑定与发送结果更新。</p><input aria-label="pushplus 回调地址" readOnly value={resource.data.callbackUrl}/><button className="secondary-button small" onClick={() => void navigator.clipboard.writeText(resource.data!.callbackUrl!).then(() => setSuccess("回调地址已复制。")).catch(() => setError("复制失败，请手动复制。"))}>复制地址</button></div>}
    </>}
  </section>;
}
export function AdminPage() {
    const [tab, setTab] = useState<"tasks" | "members" | "reminders">("tasks");
    return <div className="page-width"><div className="page-heading"><div><h1>管理后台</h1><p>安排任务，了解团队每天的完成情况。</p></div><span className="status-tag">管理员</span></div>
    <div className="admin-tabs" role="tablist" aria-label="管理功能">{[{ key: "tasks" as const, label: "任务管理", icon: ListChecks }, { key: "members" as const, label: "成员记录", icon: UsersThree }, { key: "reminders" as const, label: "提醒设置", icon: Bell }].map(({ key, label, icon: Icon }) => <button key={key} id={`tab-${key}`} role="tab" aria-selected={tab === key} aria-controls="admin-panel" className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon />{label}</button>)}</div>
    <div id="admin-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>{tab === "tasks" ? <TaskManager /> : tab === "members" ? <MemberOverview /> : <ReminderManager />}</div>
  </div>;
}
