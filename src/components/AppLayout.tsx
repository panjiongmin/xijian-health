import { CalendarDots, CheckSquare, GearSix, Moon, Sun, UserCircle, Notebook } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth-context";
import { dateInBeijing } from "../use-resource";
export function AppLayout() {
    const { user } = useAuth();
    const [date, setDate] = useState(dateInBeijing);
    useEffect(() => {
        const refresh = () => setDate(dateInBeijing());
        const timer = window.setInterval(refresh, 30000);
        window.addEventListener("focus", refresh);
        return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
    }, []);
    const day = new Date(`${date}T12:00:00+08:00`);
    const weekday = (day.getUTCDay() + 6) % 7;
    const monthLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", timeZone: "Asia/Shanghai" }).format(day);
    const weekdayLabel = new Intl.DateTimeFormat("zh-CN", { weekday: "long", timeZone: "Asia/Shanghai" }).format(day);
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem("checkin-theme");
        return saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    });
    useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("checkin-theme", dark ? "dark" : "light"); }, [dark]);
    const links = [{ to: "/", label: "今日打卡", icon: CheckSquare }, { to: "/records", label: "我的记录", icon: CalendarDots },
        ...(user?.role === "admin" ? [{ to: "/admin", label: "管理后台", icon: GearSix }] : []), { to: "/me", label: "个人设置", icon: UserCircle }];
    return <div className="app-shell">
    <header className="site-header"><div className="header-inner">
      <Link className="brand" to="/"><span className="brand-mark"><Notebook weight="thin"/></span><span>息间<span className="brand-note">我的日常记录本</span></span></Link>
      <div className="header-actions"><button className="icon-button" aria-label={dark ? "切换浅色模式" : "切换深色模式"} onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button>{user && <Link className="profile-link" to="/me"><span className="avatar">{user.displayName.slice(0, 1)}</span><span className="profile-name">{user.displayName}</span></Link>}</div>
    </div></header>
    <main className="main-content"><div className="journal-book">
      <aside className="journal-cover" aria-label="今日手帐日期">
        <p className="journal-year">{date.slice(0, 4)} 年 · 每日手帐</p>
        <div className="journal-date"><h2>{monthLabel}<br />{Number(date.slice(8))} 日</h2><p>{weekdayLabel}</p></div>
        <div className="journal-stamp" aria-hidden="true">息间<strong>每日</strong>记录</div>
        <p className="journal-motto">今天，也值得认真记下。</p>
        <img className="journal-art" src="/design-assets/reading.svg" alt="" width="240" height="180"/>
        <section className="journal-week" aria-label="本周日期"><h3>这一周</h3><div>{["一", "二", "三", "四", "五", "六", "日"].map((label, i) => {
            const weekDay = new Date(day); weekDay.setUTCDate(day.getUTCDate() - weekday + i);
            return <span key={label} className={i === weekday ? "current" : ""} aria-current={i === weekday ? "date" : undefined}>{label}<b>{weekDay.getUTCDate()}</b></span>;
        })}</div></section>
        <p className="journal-cover-foot">{user ? `${user.displayName}的日常` : "从今天的一次打卡开始。"}<span>把小事，做成每天。</span></p>
      </aside>
      <div className="journal-binding" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i}/>)}</div>
      <div className="journal-paper"><Outlet /></div>
    </div>
    {user && <nav className="journal-tabs" aria-label="主导航">{links.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to === "/"}><Icon weight="thin"/>{label}</NavLink>)}</nav>}
    </main>
    <footer className="site-footer">息间 · 把每天的小事，认真完成。<span>北京时间 · Asia/Shanghai</span></footer>
    {user && <nav className="mobile-nav" aria-label="移动端导航">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"}><Icon /><span>{label}</span></NavLink>)}</nav>}
  </div>;
}
