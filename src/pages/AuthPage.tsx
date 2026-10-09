import { CheckSquare } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { message } from "../use-resource";
export function AuthPage({ mode }: {
    mode: "login" | "register";
}) {
    const { user, login, register } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const isRegister = mode === "register";
    if (user)
        return <Navigate to="/" replace/>;
    const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try {
        if (isRegister)
            await register(email, password, displayName);
        else
            await login(email, password);
    }
    catch (cause) {
        setError(message(cause));
    }
    finally {
        setBusy(false);
    } };
    return <div className="page-width auth-page"><div className="auth-intro"><CheckSquare weight="duotone"/><h1>把小事，<br />做成每天。</h1><p>和团队一起设定目标、记录完成。<br />从今天的一次打卡开始。</p><div className="auth-note">任务打卡 · 图片记录 · 微信提醒</div></div>
    <form className="auth-form" onSubmit={event => void submit(event)}><h2>{isRegister ? "创建成员账号" : "登录息间"}</h2><p className="muted">{isRegister ? "加入团队，开始每日打卡。" : "继续完成今天的任务。"}</p>
      {isRegister && <label>昵称<input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={20} autoComplete="nickname" required/></label>}
      <label>邮箱<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required/></label>
      <label>密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} maxLength={72} required/>{isRegister && <small>至少 8 位。打卡记录及图片可由团队管理员查看。</small>}</label>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full" disabled={busy}>{busy ? "正在提交…" : isRegister ? "创建账号" : "登录"}</button>
      <p className="auth-switch">{isRegister ? "已有账号？" : "还没有账号？"}<Link to={isRegister ? "/login" : "/register"}>{isRegister ? "去登录" : "注册成员账号"}</Link></p>
    </form>
  </div>;
}
