import { PencilSimple, Plus, Check, UsersThree, Bell, ListChecks, CaretDown, IdentificationCard } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth-context";
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
    const { user } = useAuth();
    const [date, setDate] = useState(dateInBeijing);
    const [pendingOnly, setPendingOnly] = useState(false);
    const [includeSelf, setIncludeSelf] = useState(true);
    const [expanded, setExpanded] = useState<string[]>([]);
    const resource = useResource<{
        date: string;
        tasks: Task[];
        members: Member[];
    }>(`/api/admin/overview?date=${date}`);
    const doneCount = (member: Member) => member.tasks.filter(task => task.checkinId).length;
    const isDone = (member: Member) => member.tasks.length > 0 && doneCount(member) === member.tasks.length;
    const counted = (resource.data?.members || []).filter(member => includeSelf || member.id !== user?.id);
    const complete = counted.filter(isDone).length;
    const shown = counted.filter(member => !pendingOnly || !isDone(member)).map((member, index) => ({ member, index }))
        .sort((a, b) => (doneCount(a.member) / (a.member.tasks.length || 1)) - (doneCount(b.member) / (b.member.tasks.length || 1)) || a.index - b.index).map(item => item.member);
    const toggle = (id: string) => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    return <section><div className="section-toolbar"><div><h2>成员完成情况</h2><p className="muted">未完成的成员排在前面，点开查看任务和图片。</p></div><label className="date-filter">日期<input type="date" value={date} max={dateInBeijing()} onChange={event => { if (event.target.value)
        setDate(event.target.value); }}/></label></div><Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && <><div className="overview-summary"><span>{counted.length} 位成员</span><span>{resource.data.tasks.length} 项任务</span><span>{complete} 位全部完成</span><span><strong>{counted.length - complete}</strong> 位未完成</span><button className="text-button" onClick={resource.reload}>刷新</button></div>
      <div className="overview-filters"><label className="checkbox-field"><input type="checkbox" checked={pendingOnly} onChange={event => setPendingOnly(event.target.checked)}/>只看未完成</label><label className="checkbox-field"><input type="checkbox" checked={includeSelf} onChange={event => setIncludeSelf(event.target.checked)}/>统计管理员本人</label></div>
      {!resource.data.members.length && <div className="empty-state"><UsersThree /><h3>这一天还没有成员</h3><p>成员注册后，会在对应日期显示。</p></div>}
      {resource.data.members.length > 0 && !shown.length && <p className="muted overview-empty">{pendingOnly ? "所有成员都已完成。" : "没有需要显示的成员。"}</p>}
      <div className="member-list">{shown.map(member => {
            const open = expanded.includes(member.id);
            const pending = member.tasks.filter(task => !task.checkinId);
            return <article className={`member-row ${open ? "is-open" : ""}`} key={member.id}><button className="member-heading" aria-expanded={open} aria-controls={`member-${member.id}`} onClick={() => toggle(member.id)}><span className="avatar">{member.displayName.slice(0, 1)}</span><div className="member-summary"><h3>{member.displayName}</h3><p>{!member.tasks.length ? "当天没有任务" : pending.length ? `未完成：${pending.map(task => task.title).join("、")}` : "全部完成"}</p></div>{member.reminder && <span className={`status-tag ${member.reminder.status === "failed" ? "error" : ""}`} title={member.reminder.errorCode || undefined}>提醒：{deliveryLabels[member.reminder.status] || member.reminder.status}</span>}<span className="member-progress"><progress max={member.tasks.length || 1} value={doneCount(member)}/><strong>{doneCount(member)}/{member.tasks.length}</strong></span><CaretDown className="member-caret" aria-hidden="true"/></button>
        {open && <div className="member-tasks" id={`member-${member.id}`}><p className="muted member-email">{member.email}</p>{member.tasks.map(task => <div className="member-task" key={task.id}><span className={task.checkinId ? "done-label" : "muted"}>{task.checkinId ? <Check weight="bold"/> : <span className="pending-dot"/>}{task.title}</span><span className="muted">{task.checkinId ? "已完成" : "未完成"}</span>{task.images.length > 0 && <div className="image-strip">{task.images.map(image => <a key={image.id} className="image-thumb" href={image.url} target="_blank" rel="noreferrer"><img loading="lazy" src={image.url} alt={`${member.displayName}的${task.title}打卡图片`}/></a>)}</div>}</div>)}</div>}
      </article>;
        })}</div>
    </>}
  </section>;
}
type Account = {
    id: string;
    displayName: string;
    email: string;
    status: string;
    createdAt: string;
    role: "admin" | "member";
};
function AccountManager() {
    const resource = useResource<{
        inviteCode: string;
        members: Account[];
    }>("/api/admin/members");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [tempPassword, setTempPassword] = useState<{
        name: string;
        password: string;
    } | null>(null);
    const act = async (operation: () => Promise<unknown>, done: string) => { setBusy(true); setError(""); setSuccess(""); try {
        await operation();
        setSuccess(done);
        resource.reload();
    }
    catch (cause) {
        setError(message(cause));
    }
    finally {
        setBusy(false);
    } };
    const inviteCode = resource.data?.inviteCode || "";
    const inviteLink = inviteCode ? `${window.location.origin}/register?invite=${inviteCode}` : "";
    return <section><div className="section-toolbar"><div><h2>成员账号</h2><p className="muted">用邀请码控制谁能注册，停用离开团队的成员。</p></div></div><Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && <>
      <div className="invite-panel"><h3>注册邀请码</h3>{inviteCode ? <><p className="muted">新成员注册时需要填写邀请码，或直接打开邀请链接。</p><div className="invite-code"><strong>{inviteCode}</strong><button className="secondary-button small" disabled={busy} onClick={() => void navigator.clipboard.writeText(inviteLink).then(() => setSuccess("邀请链接已复制。")).catch(() => setError("复制失败，请手动复制。"))}>复制邀请链接</button></div><div className="row-actions"><button className="text-button" disabled={busy} onClick={() => void act(() => apiRequest("/api/admin/invite", { method: "PUT", body: JSON.stringify({ action: "generate" }) }), "已生成新的邀请码，旧邀请码失效。")}>换一个</button><button className="text-button danger" disabled={busy} onClick={() => { if (window.confirm("关闭后任何人都能直接注册，确定吗？"))
            void act(() => apiRequest("/api/admin/invite", { method: "PUT", body: JSON.stringify({ action: "clear" }) }), "已关闭邀请码，注册对所有人开放。"); }}>关闭邀请码</button></div></> : <><p className="notice">当前任何拿到网址的人都能注册。生成邀请码后，只有知道邀请码的人才能加入。</p><button className="primary-button" disabled={busy} onClick={() => void act(() => apiRequest("/api/admin/invite", { method: "PUT", body: JSON.stringify({ action: "generate" }) }), "邀请码已生成。")}>生成邀请码</button></>}</div>
      {error && <p className="form-error" role="alert">{error}</p>}{success && <p className="success-notice" role="status">{success}</p>}
      {tempPassword && <div className="notice temp-password" role="status"><p>{tempPassword.name} 的临时密码：<strong>{tempPassword.password}</strong></p><p>只显示这一次，请转告对方登录后在个人设置里修改。</p><button className="text-button" onClick={() => setTempPassword(null)}>我已记下</button></div>}
      <div className="managed-task-list">{resource.data.members.map(member => <article className="managed-task account-row" key={member.id}><div><div className="task-title"><h3>{member.displayName}</h3><span className={`status-tag ${member.status === "active" ? "success" : ""}`}>{member.role === "admin" ? "管理员" : member.status === "active" ? "正常" : "已停用"}</span></div><div className="task-meta">{member.email}</div></div>{member.role !== "admin" && <div className="row-actions"><button className="secondary-button small" disabled={busy} onClick={() => { if (window.confirm(`为 ${member.displayName} 生成临时密码？对方当前的登录会失效。`))
                void act(async () => { const result = await apiRequest<{
                    password: string;
                }>(`/api/admin/members/${member.id}/password`, { method: "POST" }); setTempPassword({ name: member.displayName, password: result.password }); }, "已重置密码。"); }}>重置密码</button><button className={`text-button ${member.status === "active" ? "danger" : ""}`} disabled={busy} onClick={() => { const disable = member.status === "active"; if (!disable || window.confirm(`停用 ${member.displayName}？对方将无法登录，也不再计入统计，历史记录保留。`))
                void act(() => apiRequest(`/api/admin/members/${member.id}`, { method: "PUT", body: JSON.stringify({ status: disable ? "disabled" : "active" }) }), disable ? "成员已停用。" : "成员已恢复。"); }}>{member.status === "active" ? "停用" : "恢复"}</button></div>}</article>)}</div>
    </>}
  </section>;
}
function ReminderManager() {
    const resource = useResource<ReminderConfig>("/api/admin/reminders");
    const [form, setForm] = useState({ enabled: false, reminderTime: "20:07", siteUrl: "", provider: "pushplus" as "pushplus" | "webhook", webhookUrl: "", webhookToken: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    useEffect(() => { if (resource.data)
        setForm({ enabled: resource.data.enabled, reminderTime: resource.data.reminderTime, siteUrl: resource.data.siteUrl, provider: resource.data.provider, webhookUrl: resource.data.webhookUrl, webhookToken: "" }); }, [resource.data]);
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
    const sendTest = async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
            await apiRequest("/api/admin/reminders/test", { method: "POST" });
            setSuccess("推送服务已受理测试通知，请在微信中确认收到。");
        } catch (cause) { setError(message(cause)); }
        finally { setBusy(false); }
    };
    const webhookChanged = !resource.data || form.webhookUrl !== resource.data.webhookUrl || Boolean(form.webhookToken.trim());
    return <section><div className="section-toolbar"><div><h2>通知提醒</h2><p className="muted">选择通知方式，设置每日提醒时间。</p></div></div><Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && <>
      <form className="settings-form" onSubmit={event => void submit(event)}>
        <label>通知方式<select value={form.provider} onChange={event => setForm({ ...form, provider: event.target.value as "pushplus" | "webhook" })}><option value="pushplus">pushplus · 成员提醒</option><option value="webhook">Webhook · 团队汇总</option></select></label>
        {form.provider === "webhook" ? <>
          <p className="notice">每天向 Token 绑定的微信发送一条团队未完成汇总。成员无需单独绑定微信；全部完成或当天没有任务时不发送。</p>
          <label>Webhook 地址<input type="url" value={form.webhookUrl} onChange={event => setForm({ ...form, webhookUrl: event.target.value })} placeholder="https://push.188876.xyz/send" required/><small>使用 HTTPS 接口，按 token、title、content 三个字段发送 JSON。</small></label>
          <label>Webhook Token<input type="password" autoComplete="new-password" value={form.webhookToken} onChange={event => setForm({ ...form, webhookToken: event.target.value })} placeholder={resource.data.webhookTokenConfigured ? "已配置，留空保留原 Token" : "输入推送服务的 Token"} required={!resource.data.webhookTokenConfigured}/><small>{resource.data.webhookTokenConfigured ? "Token 已配置，保存后不会回显。" : "Token 仅用于服务端发送通知。"}</small></label>
        </> : <>
          <p className="notice">每日提醒未完成且已绑定的成员，每人每天最多一次。</p>
          <div className="provider-status">{[{ key: "token" as const, label: "pushplus Token" }, { key: "secretKey" as const, label: "pushplus SecretKey" }, { key: "callbackSecret" as const, label: "回调密钥" }].map(item => <div key={item.key}><span>{item.label}</span><span className={`status-tag ${resource.data?.configured[item.key] ? "success" : ""}`}>{resource.data?.configured[item.key] ? "已配置" : "未配置"}</span></div>)}</div>
          {!Object.values(resource.data.configured).every(Boolean) && <p className="notice">补齐 pushplus 配置后，成员才能扫码绑定。</p>}
        </>}
        <label>提醒时间（北京时间）<input type="time" value={form.reminderTime} onChange={event => setForm({ ...form, reminderTime: event.target.value })} required/></label>
        <label>打卡网站公开地址<input type="url" value={form.siteUrl} onChange={event => setForm({ ...form, siteUrl: event.target.value })} placeholder="https://你的打卡域名"/><small>用于在手机打开打卡页。</small></label>
        <label className="checkbox-field"><input type="checkbox" checked={form.enabled} onChange={event => setForm({ ...form, enabled: event.target.checked })}/>开启每日自动提醒</label>
        {error && <p className="form-error" role="alert">{error}</p>}{success && <p className="success-notice" role="status">{success}</p>}
        <div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? "正在处理…" : "保存提醒设置"}</button>
        {form.provider === "webhook" && <button type="button" className="secondary-button" disabled={busy || webhookChanged || !resource.data.webhookTokenConfigured || !resource.data.webhookUrl} onClick={() => void sendTest()}>发送测试通知</button>}</div>
        {form.provider === "webhook" && webhookChanged && <small>保存配置后可发送一条真实测试通知。</small>}
      </form>
      {form.provider === "pushplus" && resource.data.callbackUrl && <div className="callback-setting"><h3>pushplus 回调地址</h3><p className="muted">将此地址填入 pushplus 的“功能设置 → 回调地址”，用于扫码绑定与发送结果更新。</p><input aria-label="pushplus 回调地址" readOnly value={resource.data.callbackUrl}/><button className="secondary-button small" onClick={() => void navigator.clipboard.writeText(resource.data!.callbackUrl!).then(() => setSuccess("回调地址已复制。")).catch(() => setError("复制失败，请手动复制。"))}>复制地址</button></div>}
    </>}
  </section>;
}
export function AdminPage() {
    const [tab, setTab] = useState<"tasks" | "members" | "accounts" | "reminders">("tasks");
    return <div className="page-width"><div className="page-heading"><div><h1>管理后台</h1><p>安排任务，了解团队每天的完成情况。</p></div><span className="status-tag">管理员</span></div>
    <div className="admin-tabs" role="tablist" aria-label="管理功能">{[{ key: "tasks" as const, label: "任务管理", icon: ListChecks }, { key: "members" as const, label: "完成情况", icon: UsersThree }, { key: "accounts" as const, label: "成员账号", icon: IdentificationCard }, { key: "reminders" as const, label: "提醒设置", icon: Bell }].map(({ key, label, icon: Icon }) => <button key={key} id={`tab-${key}`} role="tab" aria-selected={tab === key} aria-controls="admin-panel" className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon />{label}</button>)}</div>
    <div id="admin-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>{tab === "tasks" ? <TaskManager /> : tab === "members" ? <MemberOverview /> : tab === "accounts" ? <AccountManager /> : <ReminderManager />}</div>
  </div>;
}
