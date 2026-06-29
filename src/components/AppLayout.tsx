import {
  CalendarDots,
  Compass,
  Eye,
  House,
  Palette,
  PlayCircle,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth-context";

type Theme = "songhua" | "tianqing" | "cangjia" | "haitang" | "qingdai";

const themes: Array<{ key: Theme; label: string; note: string; color: string }> = [
  { key: "songhua", label: "松花", note: "清润护眼", color: "#2f6b4f" },
  { key: "tianqing", label: "天青", note: "雨后清蓝", color: "#2f6f8f" },
  { key: "cangjia", label: "苍葭", note: "芦苇浅绿", color: "#6f805d" },
  { key: "haitang", label: "海棠", note: "柔粉暖调", color: "#9d5b6b" },
  { key: "qingdai", label: "青黛", note: "夜间低亮", color: "#6f7fa8" },
];

function resolveStoredTheme(): Theme {
  const stored = localStorage.getItem("xijian-theme");
  if (themes.some((item) => item.key === stored)) return stored as Theme;
  if (stored === "dark") return "qingdai";
  if (stored === "light") return "songhua";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "qingdai" : "songhua";
}

const mainLinks = [
  { to: "/", label: "首页", icon: House },
  { to: "/train", label: "训练", icon: PlayCircle },
  { to: "/discover", label: "发现", icon: Compass },
  { to: "/community", label: "社区", icon: UsersThree },
  { to: "/records", label: "记录", icon: CalendarDots },
];

export function AppLayout() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => resolveStoredTheme());
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTheme = themes.find((item) => item.key === theme) ?? themes[0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("xijian-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!themeMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (themeMenuRef.current?.contains(event.target as Node)) return;
      setThemeMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setThemeMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [themeMenuOpen]);

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
            <div className="theme-switcher" ref={themeMenuRef}>
              <button
                type="button"
                className="theme-trigger"
                aria-label={`切换主题色，当前为${activeTheme.label}`}
                aria-expanded={themeMenuOpen}
                onClick={() => setThemeMenuOpen((value) => !value)}
              >
                <span className="theme-trigger-swatch" style={{ background: activeTheme.color }} aria-hidden="true" />
                <Palette />
                <span className="theme-trigger-label">{activeTheme.label}</span>
              </button>
              {themeMenuOpen && (
                <div className="theme-menu" role="menu" aria-label="中国色主题">
                  <div className="theme-menu-heading">
                    <strong>中国色主题</strong>
                    <span>取意 zhongguose.com</span>
                  </div>
                  {themes.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={item.key === theme ? "active" : ""}
                      onClick={() => {
                        setTheme(item.key);
                        setThemeMenuOpen(false);
                      }}
                      role="menuitemradio"
                      aria-checked={item.key === theme}
                    >
                      <span className="theme-option-swatch" style={{ background: item.color }} aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
