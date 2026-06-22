import { Gear, LockKey, SignOut, UserCircle } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";

export function MePage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="page-loading" />;

  if (!user) {
    return (
      <div className="me-guest page-width">
        <UserCircle weight="duotone" />
        <h1>保存你的每一次完成</h1>
        <p>登录后可以同步训练、查看记录，并选择是否发布到社区。</p>
        <div>
          <Link className="primary-button" to="/login">登录</Link>
          <Link className="secondary-button" to="/register">创建账号</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="me-page page-width">
      <header className="profile-header">
        <div className={`avatar avatar-${user.avatarCode} large-avatar`} aria-hidden="true">
          {user.displayName.slice(0, 1)}
        </div>
        <div>
          <h1>{user.displayName}</h1>
          <p>{user.email}</p>
        </div>
      </header>

      <div className="settings-list">
        <button type="button">
          <Gear weight="duotone" />
          <span><strong>训练偏好</strong><small>图形、节奏与时长</small></span>
        </button>
        <button type="button">
          <UserCircle weight="duotone" />
          <span><strong>社区主页</strong><small>公开记录与隐私范围</small></span>
        </button>
        <button type="button">
          <LockKey weight="duotone" />
          <span><strong>账号与安全</strong><small>密码、数据与账号删除</small></span>
        </button>
      </div>

      <button
        type="button"
        className="logout-button"
        onClick={() => void logout().then(() => navigate("/"))}
      >
        <SignOut />
        退出登录
      </button>
    </div>
  );
}
