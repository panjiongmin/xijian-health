import { Leaf, UsersThree } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import { PostCard } from "../components/PostCard";
import type { CommunityPost, HomeSummary } from "../types";

type FeedTab = "recommended" | "latest" | "following";

export function CommunityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedTab>("recommended");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ posts: CommunityPost[] }>(
        `/api/community/feed?tab=${tab}&limit=12`,
      );
      setPosts(result.posts);
    } catch {
      setError("社区暂时没有加载成功，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!user) return;
    apiRequest<HomeSummary>("/api/home").then(setSummary).catch(() => undefined);
  }, [user]);

  const onEncouragementChange = (postId: string, encouraged: boolean, count: number) => {
    setPosts((items) =>
      items.map((post) =>
        post.id === postId
          ? { ...post, encouragedByMe: encouraged, encouragementCount: count }
          : post,
      ),
    );
  };

  return (
    <div className="community-page page-width">
      <header className="page-heading">
        <span className="eyebrow">养生社区</span>
        <h1>看看大家今天做了什么。</h1>
        <p>真实打卡，轻轻鼓励，不比较健康结果。</p>
      </header>

      <div className="community-layout">
        <div className="feed-column">
          <div className="feed-tabs" role="tablist" aria-label="社区动态分类">
            {([
              ["recommended", "推荐"],
              ["latest", "最新"],
              ["following", "关注"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={tab === value ? "active" : ""}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="feed-skeleton" aria-label="正在加载社区动态">
              <div />
              <div />
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button type="button" className="secondary-button" onClick={() => void loadFeed()}>
                重新加载
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <Leaf weight="duotone" />
              <h2>{tab === "following" ? "关注的人还没有新动态" : "这里还很安静"}</h2>
              <p>{tab === "following" ? "先看看推荐动态，找到想一起坚持的人。" : "完成训练后，你可以发布第一条公开打卡。"}</p>
              <Link className="primary-button" to={tab === "following" ? "/community" : "/train"}>
                {tab === "following" ? "查看推荐" : "开始训练"}
              </Link>
            </div>
          ) : (
            <div className="feed-list">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEncouragementChange={onEncouragementChange}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="community-sidebar">
          {user && summary ? (
            <div className="sidebar-summary">
              <span>我的本周记录</span>
              <strong>{summary.weekCount} 天</strong>
              <p>连续 {summary.streak} 天，累计 {summary.totalCount} 次</p>
              <Link to="/records">查看记录</Link>
            </div>
          ) : (
            <div className="sidebar-summary">
              <UsersThree weight="duotone" />
              <strong>加入这段陪伴</strong>
              <p>登录后可以鼓励别人，也可以发布自己的打卡。</p>
              <Link to="/register">创建账号</Link>
            </div>
          )}
          <div className="community-rules">
            <h2>社区约定</h2>
            <p>分享行动，不诊断他人。</p>
            <p>尊重隐私，不发布联系方式。</p>
            <p>不承诺疗效，不推销偏方。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
