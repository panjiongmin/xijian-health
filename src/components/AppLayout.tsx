import {
  CalendarDots,
  Compass,
  Eye,
  House,
  Moon,
  PlayCircle,
  Sun,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth-context";

type Theme = "light" | "dark";

const mainLinks = [
  { to: "/", label: "首页", icon: House },
  { to: "/train", label: "训练", icon: PlayCircle },
  { to: "/discover", label: "发现", icon: Compass },
  { to: "/community", label: "社区", icon: UsersThree },
  { to: "/records", label: "记录", icon: CalendarDots },
];

export function AppLayout() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("xijian-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("xijian-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="息间首页">
            <span className="brand-mark" aria-hidden="true">
              <Eye weight="duotone" />
            </span>
            <span>息间</span>
          </Link>

          <nav className="desktop-nav" aria-label="主导航">
            {mainLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label={theme === "light" ? "切换深色模式" : "切换浅色模式"}
              onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </button>
            {!loading &&
              (user ? (
                <Link className="profile-link" to="/me">
                  <span className={`avatar avatar-${user.avatarCode}`} aria-hidden="true">
                    {user.displayName.slice(0, 1)}
                  </span>
                  <span>{user.displayName}</span>
                </Link>
              ) : (
                <Link className="text-button" to="/login">
                  登录
                </Link>
              ))}
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <span className="footer-brand">息间</span>
          <p>一款帮助你建立轻量健康习惯的工具。</p>
        </div>
        <p>训练仅用于一般性的用眼休息与专注练习，不替代医疗诊断或治疗。</p>
      </footer>

      <nav className="mobile-nav" aria-label="移动端主导航">
        {mainLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon weight="regular" />
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/me">
          <UserCircle />
          <span>我的</span>
        </NavLink>
      </nav>
    </div>
  );
}
