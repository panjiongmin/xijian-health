import { ArrowRight, CheckCircle, Bell } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth-context";
import { TaskCard } from "../components/TaskCard";
import { Feedback } from "../components/Feedback";
import { dateInBeijing, useResource } from "../use-resource";
import type { TodayData } from "../types";
export function TodayPage() {
    const { user } = useAuth();
    const [date, setDate] = useState(dateInBeijing);
    const { data, error, loading, reload } = useResource<TodayData>(`/api/today?date=${date}`);
    useEffect(() => { const refreshDate = () => setDate(dateInBeijing()); const timer = setInterval(refreshDate, 30000); window.addEventListener("focus", refreshDate); return () => { clearInterval(timer); window.removeEventListener("focus", refreshDate); }; }, []);
    const tasks = data?.tasks || [];
    const done = tasks.filter(task => task.checkinId).length;
    const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Shanghai" }).format(new Date(`${data?.date || date}T12:00:00+08:00`));
    return <div className="page-width today-page">
    <div className="page-heading"><div><p className="date-label">{dateLabel}</p><h1>今天的几件小事</h1><p>{user?.displayName}，按自己的节奏，认真完成。</p></div><Link className="subtle-link" to="/records">翻看记录 <ArrowRight weight="thin"/></Link></div>
    <Feedback error={error} loading={loading} retry={reload}/>
    {data && <><section className="daily-progress" aria-label="今日进度"><div><strong>今日进度</strong><span>{done} / {tasks.length} 项已完成</span></div><progress max={tasks.length || 1} value={done}/>{tasks.length > 0 && done === tasks.length && <p className="completion-message"><CheckCircle weight="thin"/>今天的任务全部完成了，明天继续。</p>}</section>
      <section className="task-list" aria-label="今日任务列表">{tasks.map(task => <TaskCard key={`${data.date}-${task.id}`} task={task} date={data.date} onChange={reload}/>)}</section>
      {!tasks.length && <div className="empty-state"><CheckCircle /><h2>今天没有安排任务</h2><p>{user?.role === "admin" ? "创建一个任务，开始团队的每日打卡。" : "管理员安排任务后，会在这里显示。"}</p>{user?.role === "admin" && <Link className="primary-button" to="/admin">创建任务</Link>}</div>}
      <div className="reminder-note"><Bell /><span>{data.reminderTime ? `每日 ${data.reminderTime} 提醒未完成成员` : "微信提醒可在个人设置中绑定"}</span><Link to="/me">设置提醒 <ArrowRight /></Link></div>
    </>}
  </div>;
}
