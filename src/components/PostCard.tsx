import {
  ChatCircle,
  DotsThree,
  HandsClapping,
  PaperPlaneTilt,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api";
import { useAuth } from "../auth-context";
import type { CommunityComment, CommunityPost } from "../types";

type PostCardProps = {
  post: CommunityPost;
  onEncouragementChange?: (postId: string, encouraged: boolean, count: number) => void;
};

type AvatarViewProps = {
  name: string;
  code: string;
  imageUrl?: string | null;
  className?: string;
};

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60_000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function AvatarView({ name, code, imageUrl, className = "" }: AvatarViewProps) {
  return (
    <div className={`avatar avatar-${code} ${imageUrl ? "avatar-image" : ""} ${className}`.trim()} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" decoding="async" /> : name.slice(0, 1)}
    </div>
  );
}

export function PostCard({ post, onEncouragementChange }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    setCommentCount(post.commentCount);
    setComments([]);
    setCommentsLoaded(false);
    setCommentsError("");
    setCommentText("");
  }, [post.id, post.commentCount]);

  useEffect(() => {
    if (!commentsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [commentsOpen]);

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

  const loadComments = async () => {
    setCommentsLoading(true);
    setCommentsError("");
    try {
      const result = await apiRequest<{ comments: CommunityComment[] }>(
        `/api/community/posts/${post.id}/comments?limit=50`,
      );
      setComments(result.comments);
      setCommentsLoaded(true);
    } catch (cause) {
      setCommentsError(cause instanceof ApiError ? cause.message : "评论暂时没有加载成功。");
    } finally {
      setCommentsLoading(false);
    }
  };

  const openComments = () => {
    setCommentsOpen(true);
    if (!commentsLoaded && !commentsLoading) void loadComments();
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      navigate("/login?next=/community");
      return;
    }
    const content = commentText.trim();
    if (!content || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentsError("");
    try {
      const result = await apiRequest<{ comment: CommunityComment | null }>(
        `/api/community/posts/${post.id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
      );
      if (result.comment) {
        setComments((items) => [...items, result.comment as CommunityComment]);
        setCommentCount((value) => value + 1);
        setCommentsLoaded(true);
      }
      setCommentText("");
    } catch (cause) {
      setCommentsError(cause instanceof ApiError ? cause.message : "评论没有发布成功。");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await apiRequest<void>(`/api/community/comments/${commentId}`, { method: "DELETE" });
      setComments((items) => items.filter((comment) => comment.id !== commentId));
      setCommentCount((value) => Math.max(0, value - 1));
    } catch (cause) {
      setCommentsError(cause instanceof ApiError ? cause.message : "评论没有删除成功。");
    }
  };

  return (
    <article className="community-post">
      <header className="post-header">
        <AvatarView name={post.nickname} code={post.avatarCode} imageUrl={post.avatarUrl} />
        <div className="post-person">
          <strong>{post.nickname}</strong>
          <span>松眸训练 · {relativeTime(post.createdAt)}</span>
        </div>
        <button type="button" className="icon-button quiet" aria-label="更多操作">
          <DotsThree weight="bold" />
        </button>
      </header>

      <div className="post-body">
        <div className="post-action-row">
          <p className="post-action">完成了今日训练</p>
          <span>{post.durationBucket}</span>
        </div>
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
        {post.imageUrl && (
          <figure className="post-image">
            <img src={post.imageUrl} alt={`${post.nickname} 分享的打卡图片`} loading="lazy" decoding="async" />
          </figure>
        )}
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
        <button type="button" onClick={openComments}>
          <ChatCircle />
          <span>评论 {commentCount || ""}</span>
        </button>
      </footer>

      {commentsOpen && createPortal(
        <div className="comment-drawer-backdrop" onClick={() => setCommentsOpen(false)}>
          <section
            className="comment-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`comments-title-${post.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="comment-drawer-header">
              <div>
                <span>动态评论</span>
                <h2 id={`comments-title-${post.id}`}>{post.nickname} 的松眸记录</h2>
              </div>
              <button type="button" className="icon-button quiet" onClick={() => setCommentsOpen(false)} aria-label="关闭评论">
                <X />
              </button>
            </header>

            <div className="comment-source">
              <span>完成了松眸训练</span>
              {post.note && <p>{post.note}</p>}
              {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" decoding="async" />}
            </div>

            <div className="comment-list" aria-live="polite">
              {commentsLoading ? (
                <div className="comment-loading">正在加载评论</div>
              ) : commentsError && comments.length === 0 ? (
                <div className="comment-empty">
                  <p>{commentsError}</p>
                  <button type="button" onClick={() => void loadComments()}>重新加载</button>
                </div>
              ) : comments.length === 0 ? (
                <div className="comment-empty">
                  <p>还没有评论，留下第一句轻轻的鼓励。</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <article key={comment.id} className="comment-item">
                    <AvatarView
                      name={comment.nickname}
                      code={comment.avatarCode}
                      imageUrl={comment.avatarUrl}
                    />
                    <div>
                      <header>
                        <strong>{comment.nickname}</strong>
                        <span>{relativeTime(comment.createdAt)}</span>
                      </header>
                      <p>{comment.content}</p>
                    </div>
                    {comment.canDelete && (
                      <button type="button" onClick={() => void deleteComment(comment.id)} aria-label="删除评论">
                        <Trash />
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>

            {commentsError && comments.length > 0 && <p className="comment-inline-error">{commentsError}</p>}

            <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={user ? "写一句温和的回应" : "登录后可以评论"}
                maxLength={240}
                disabled={!user || commentSubmitting}
              />
              <div>
                <span>{commentText.trim().length}/240</span>
                <button type="submit" disabled={!user || commentSubmitting || commentText.trim().length === 0}>
                  <PaperPlaneTilt weight="fill" />
                  发送
                </button>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </article>
  );
}
