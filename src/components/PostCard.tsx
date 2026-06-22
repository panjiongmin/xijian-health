import {
  ChatCircle,
  DotsThree,
  HandsClapping,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import type { CommunityPost } from "../types";

type PostCardProps = {
  post: CommunityPost;
  onEncouragementChange?: (postId: string, encouraged: boolean, count: number) => void;
};

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60_000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function PostCard({ post, onEncouragementChange }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);

  const toggleEncouragement = async () => {
    if (!user) {
      navigate("/login?next=/community");
      return;
    }
    if (working) return;
    setWorking(true);
    try {
      const result = await apiRequest<{ encouraged: boolean; count: number }>(
        `/api/community/posts/${post.id}/encouragement`,
        { method: "POST" },
      );
      onEncouragementChange?.(post.id, result.encouraged, result.count);
    } finally {
      setWorking(false);
    }
  };

  return (
    <article className="community-post">
      <header className="post-header">
        <div className={`avatar avatar-${post.avatarCode}`} aria-hidden="true">
          {post.nickname.slice(0, 1)}
        </div>
        <div>
          <strong>{post.nickname}</strong>
          <span>{relativeTime(post.createdAt)}</span>
        </div>
        <button type="button" className="icon-button quiet" aria-label="更多操作">
          <DotsThree weight="bold" />
        </button>
      </header>

      <div className="post-body">
        <p className="post-action">完成了松眸训练</p>
        <div className="post-stats" aria-label="公开打卡数据">
          {post.publicStreak !== null && (
            <div>
              <strong>{post.publicStreak}</strong>
              <span>连续天数</span>
            </div>
          )}
          {post.publicWeekCount !== null && (
            <div>
              <strong>{post.publicWeekCount}</strong>
              <span>本周完成</span>
            </div>
          )}
          {post.publicTotalCount !== null && (
            <div>
              <strong>{post.publicTotalCount}</strong>
              <span>累计记录</span>
            </div>
          )}
        </div>
        {post.note && <p className="post-note">{post.note}</p>}
      </div>

      <footer className="post-footer">
        <button
          type="button"
          className={post.encouragedByMe ? "encouraged" : ""}
          onClick={() => void toggleEncouragement()}
          disabled={working}
        >
          <HandsClapping weight={post.encouragedByMe ? "fill" : "regular"} />
          <span>鼓励 {post.encouragementCount || ""}</span>
        </button>
        <button type="button">
          <ChatCircle />
          <span>评论 {post.commentCount || ""}</span>
        </button>
      </footer>
    </article>
  );
}
