import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { Feedback } from "../components/Feedback";
import { TaskCard } from "../components/TaskCard";
import type { Task } from "../types";
import { dateInBeijing, useResource } from "../use-resource";
type MonthData = {
    month: string;
    totalDays: number;
    days: Array<{
        date: string;
        planned: number;
        completed: number;
    }>;
};
export function RecordsPage() {
    const today = dateInBeijing();
    const [month, setMonth] = useState(today.slice(0, 7));
    const [selected, setSelected] = useState(today);
    const resource = useResource<MonthData>(`/api/records?month=${month}`);
    const detail = useResource<{
        date: string;
        tasks: Task[];
    }>(`/api/records/day?date=${selected}`);
    const [year, monthNumber] = month.split("-").map(Number);
    const leading = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
    const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const shift = (amount: number) => { const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1)); const next = date.toISOString().slice(0, 7); setMonth(next); setSelected(next === today.slice(0, 7) ? today : `${next}-01`); };
    return <div className="page-width"><div className="page-heading"><div><h1>我的记录</h1><p>每一次完成，都留下了痕迹。</p></div>{resource.data && <span className="count-label">累计打卡 <strong>{resource.data.totalDays}</strong> 天</span>}</div>
    <Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
    {resource.data && <section className="calendar-panel"><div className="calendar-toolbar"><button className="icon-button" aria-label="上个月" onClick={() => shift(-1)}><CaretLeft /></button><h2>{year} 年 {monthNumber} 月</h2><button className="icon-button" aria-label="下个月" disabled={month >= today.slice(0, 7)} onClick={() => shift(1)}><CaretRight /></button></div>
      <div className="calendar-grid">{["一", "二", "三", "四", "五", "六", "日"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: leading }, (_, i) => <span key={`space-${i}`}/>)}{Array.from({ length }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                const day = resource.data?.days.find(item => item.date === date);
                const all = Boolean(day?.planned && day.completed === day.planned);
                const some = Boolean(day?.completed);
                return <button key={date} disabled={date > today} className={`calendar-day ${selected === date ? "selected" : ""} ${all ? "all-done" : some ? "part-done" : ""}`} aria-pressed={selected === date} aria-label={`${date}，${day?.completed || 0}/${day?.planned || 0} 项完成`} onClick={() => setSelected(date)}><span>{i + 1}</span><small>{day?.planned ? `${day.completed}/${day.planned}` : "—"}</small></button>;
            })}</div><div className="calendar-legend"><span><i className="legend-dot success"/>全部完成</span><span><i className="legend-dot partial"/>部分完成</span><span>— 无任务记录</span></div></section>}
    <section className="record-detail"><h2>{selected} 的任务</h2><Feedback error={detail.error} loading={detail.loading} retry={detail.reload}/>{detail.data && (detail.data.tasks.length ? <div className="task-list">{detail.data.tasks.map(task => <TaskCard key={task.id} task={task} readOnly/>)}</div> : <p className="muted">这一天没有任务记录。</p>)}</section>
  </div>;
}
