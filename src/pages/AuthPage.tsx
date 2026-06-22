import { Eye, ShieldCheck } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth-context";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/me" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && !agreed) {
      setError("请先阅读并同意用户协议与隐私政策。");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      const next = new URLSearchParams(location.search).get("next") ?? "/";
      navigate(next);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "提交失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="auth-page page-width">
      <div className="auth-intro">
        <span className="brand-mark large"><Eye weight="duotone" /></span>
        <h1>{isRegister ? "从今天开始记录。" : "欢迎回来。"}</h1>
        <p>{isRegister ? "创建账号，保存训练和打卡。" : "继续你的轻量健康习惯。"}</p>
        <div className="auth-privacy">
          <ShieldCheck weight="duotone" />
          <span>打卡默认私密，只有主动发布后才会进入社区。</span>
        </div>
      </div>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <h2>{isRegister ? "创建账号" : "登录"}</h2>
        {isRegister && (
          <label>
            <span>昵称</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="nickname"
              minLength={2}
              maxLength={20}
              required
            />
          </label>
        )}
        <label>
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          {isRegister && <small>至少 8 位，建议同时使用字母和数字。</small>}
        </label>
        {isRegister && (
          <label className="checkbox-field">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>我已阅读并同意用户协议与隐私政策</span>
          </label>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button full" disabled={submitting}>
          {submitting ? "正在提交" : isRegister ? "创建账号" : "登录"}
        </button>
        <p className="auth-switch">
          {isRegister ? "已经有账号？" : "还没有账号？"}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "去登录" : "创建账号"}</Link>
        </p>
      </form>
    </div>
  );
}
