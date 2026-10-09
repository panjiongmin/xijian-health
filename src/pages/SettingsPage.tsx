import { Bell, SignOut, QrCode } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import { Feedback } from "../components/Feedback";
import type { Notifications } from "../types";
import { message, useResource } from "../use-resource";
export function SettingsPage() {
    const { user, logout } = useAuth();
    const resource = useResource<Notifications>("/api/notifications");
    const [qr, setQr] = useState<{
        url: string;
        expiresAt: number;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => { if (!qr || resource.data?.bound)
        return; const timer = setInterval(() => { if (Date.now() >= qr.expiresAt) {
        setQr(null);
        setError("二维码已过期，请重新生成。");
    }
    else
        resource.reload(); }, 5000); return () => clearInterval(timer); }, [qr, resource.data?.bound, resource.reload]);
    const act = async (operation: () => Promise<unknown>) => { setBusy(true); setError(""); try {
        await operation();
        resource.reload();
    }
    catch (cause) {
        setError(message(cause));
    }
    finally {
        setBusy(false);
    } };
    return <div className="page-width narrow-page"><div className="page-heading"><div><h1>个人设置</h1><p>管理账号与微信提醒。</p></div></div>
    <section className="settings-section"><div className="account-heading"><span className="avatar large">{user?.displayName.slice(0, 1)}</span><div><h2>{user?.displayName}</h2><p>{user?.email}</p></div><span className="status-tag">{user?.role === "admin" ? "管理员" : "成员"}</span></div><button className="secondary-button" disabled={busy} onClick={() => void act(logout)}><SignOut />退出登录</button></section>
    <section className="settings-section"><h2 className="icon-heading"><Bell />微信打卡提醒</h2><p className="muted">每天最多提醒一次；当天任务全部完成后不再提醒。</p><Feedback error={resource.error} loading={resource.loading} retry={resource.reload}/>
      {resource.data && <>{!resource.data.available && <p className="notice">管理员正在配置微信提醒，配置完成后即可扫码绑定。</p>}
        {resource.data.bound ? <><div className="setting-row"><div><strong>接收每日提醒</strong><p>{resource.data.remindersEnabled ? `每天 ${resource.data.reminderTime}（北京时间）` : "管理员暂未开启自动提醒"}</p></div><input aria-label="接收每日微信提醒" type="checkbox" role="switch" checked={resource.data.enabled} disabled={busy} onChange={event => void act(() => apiRequest("/api/notifications", { method: "PUT", body: JSON.stringify({ enabled: event.target.checked }) }))}/></div><button className="text-button danger" disabled={busy} onClick={() => void act(async () => { await apiRequest("/api/notifications", { method: "DELETE" }); setQr(null); })}>解除微信绑定</button></>
                : <><p>关注 pushplus 公众号，扫描下方专属二维码，绑定后开启提醒。</p><button className="primary-button" disabled={busy || !resource.data.available} onClick={() => void act(async () => { const result = await apiRequest<{
                    url: string;
                    expiresIn: number;
                }>("/api/notifications/qr", { method: "POST" }); setQr({ url: result.url, expiresAt: Date.now() + result.expiresIn * 1000 }); })}><QrCode />{busy ? "正在生成…" : qr ? "刷新绑定二维码" : "扫码绑定并开启提醒"}</button>{qr && <div className="binding-qr"><img src={qr.url} alt="pushplus 微信绑定二维码"/><p>用微信扫码，10 分钟内有效。<br />绑定成功后此页面会自动更新。</p></div>}</>}
      </>}{error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </div>;
}
