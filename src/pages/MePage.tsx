import { Camera, Gear, LockKey, SignOut, UserCircle } from "@phosphor-icons/react";
import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import type { UploadedAsset } from "../types";

export function MePage() {
  const { user, loading, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || avatarUploading) return;
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const form = new FormData();
      form.append("kind", "avatar");
      form.append("file", file);
      await apiRequest<{ asset: UploadedAsset }>("/api/assets/upload", {
        method: "POST",
        body: form,
      });
      await refresh();
    } catch {
      setAvatarError("头像没有上传成功，请换一张 4MB 以内的图片。");
    } finally {
      setAvatarUploading(false);
    }
  };

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
        <div className={`avatar avatar-${user.avatarCode} ${user.avatarUrl ? "avatar-image" : ""} large-avatar`} aria-hidden="true">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.displayName.slice(0, 1)}
        </div>
        <div>
          <h1>{user.displayName}</h1>
          <p>{user.email}</p>
          <label className="avatar-upload-button">
            <Camera weight="duotone" />
            {avatarUploading ? "正在上传头像" : "更换头像"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void uploadAvatar(event)} disabled={avatarUploading} />
          </label>
          {avatarError && <p className="profile-inline-error">{avatarError}</p>}
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
