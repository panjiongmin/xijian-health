import { CalendarDots, LockKey } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import { WeekStrip } from "../components/WeekStrip";
import type { Checkin, HomeSummary } from "../types";

export function RecordsPage() {
  const { user, loading: authLoading } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiRequest<{ checkins: Checkin[] }>("/api/checkins"),
      apiRequest<HomeSummary>("/api/home"),
    ])
      .then(([checkinResult, homeResult]) => {
        setCheckins(checkinResult.checkins);
        setSummary(homeResult);
      })
      .catch(() => undefined);
  }, [user]);

  const monthDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const completed = new Set(checkins.map((item) => item.localDate));
    const items: Array<{ day?: number; completed?: boolean; key: string }> = [];
    for (let index = 0; index < firstDay; index += 1) {
      items.push({ key: `empty-${index}` });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      items.push({ key: date, day, completed: completed.has(date) });
    }
    return { items, title: `${year} 年 ${month + 1} 月` };
  }, [checkins]);

  if (authLoading) return <div className="page-loading" />;

  if (!user) {
    return (
      <div className="auth-required page-width">
        <LockKey weight="duotone" />
        <h1>登录后查看你的记录</h1>
        <p>私人打卡不会自动公开，是否分享到社区由你决定。</p>
        <Link className="primary-button" to="/login?next=/records">
          登录
        </Link>
      </div>
    );
  }

  return (
    <div className="records-page page-width">
      <header className="page-heading">
        <span className="eyebrow">我的记录</span>
        <h1>每一次完成，都算数。</h1>
        <p>不追求完美连续，只看见已经做过的努力。</p>
      </header>

      <section className="record-summary">
        <div className="record-total">
          <span>累计完成</span>
          <strong>{summary?.totalCount ?? 0}</strong>
          <p>次用眼休息训练</p>
        </div>
        <div className="record-secondary">
          <div><strong>{summary?.weekCount ?? 0}</strong><span>近 7 天</span></div>
          <div><strong>{summary?.streak ?? 0}</strong><span>连续记录</span></div>
        </div>
        <WeekStrip completedDates={summary?.recentDates ?? []} />
      </section>

      <section className="calendar-section">
        <div className="calendar-heading">
          <div>
            <CalendarDots weight="duotone" />
            <h2>{monthDays.title}</h2>
          </div>
          <span>绿色日期表示已完成</span>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="month-grid">
          {monthDays.items.map((item) => (
            <div key={item.key} className={item.completed ? "completed" : item.day ? "" : "empty"}>
              {item.day && <span>{item.day}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
