import {
  ArrowRight,
  CheckCircle,
  Eye,
  Leaf,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import { PostCard } from "../components/PostCard";
import { TrainingOrb } from "../components/TrainingOrb";
import { WeekStrip } from "../components/WeekStrip";
import type { CommunityPost, HomeSummary } from "../types";

const emptySummary: HomeSummary = {
  completedToday: false,
  weekCount: 0,
  streak: 0,
  totalCount: 0,
  recentDates: [],
};

export function HomePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<HomeSummary>(emptySummary);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [previewPaused, setPreviewPaused] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [homeResult, feedResult] = await Promise.allSettled([
        apiRequest<HomeSummary>("/api/home"),
        apiRequest<{ posts: CommunityPost[] }>("/api/community/feed?limit=2"),
      ]);
      if (homeResult.status === "fulfilled") setSummary(homeResult.value);
      if (feedResult.status === "fulfilled") setPosts(feedResult.value.posts);
    };
    void load();
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
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <span className="eyebrow">每天三分钟</span>
          <h1>盯屏太久，先让眼睛慢下来。</h1>
          <p>完成左右眼专注练习，记录每一天的用眼休息。</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/train">
              开始今日训练
              <ArrowRight weight="bold" />
            </Link>
            <Link className="secondary-button" to="/discover">
              了解训练
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <TrainingOrb
            compact
            paused={previewPaused}
            onToggle={() => setPreviewPaused((value) => !value)}
          />
          <div className="visual-note">
            <Eye weight="duotone" />
            <div>
              <strong>大小节奏专注</strong>
              <span>不闪烁，随时可以暂停</span>
            </div>
          </div>
        </div>
      </section>

      <section className="today-section page-width">
        <div className="today-main">
          <div className="section-heading">
            <h2>{summary.completedToday ? "今天已经完成" : "今天，留三分钟给自己"}</h2>
            <p>
              {summary.completedToday
                ? "记录已经保存，可以去社区看看大家的今天。"
                : "左右眼各一段，完成后自动记录。"}
            </p>
          </div>
          <Link className="inline-link" to={summary.completedToday ? "/community" : "/train"}>
            {summary.completedToday ? "进入社区" : "开始训练"}
            <ArrowRight />
          </Link>
        </div>
        <div className="today-stats">
          <div>
            <strong>{summary.weekCount}</strong>
            <span>近 7 天完成</span>
          </div>
          <div>
            <strong>{summary.streak}</strong>
            <span>连续记录</span>
          </div>
          <div>
            <strong>{summary.totalCount}</strong>
            <span>累计训练</span>
          </div>
        </div>
        <WeekStrip completedDates={summary.recentDates} />
      </section>

      <section className="how-section page-width">
        <div className="section-heading narrow">
          <h2>一段容易坚持的用眼间歇</h2>
          <p>看清提示，跟随节奏，完成后自然回到手头的事情。</p>
        </div>
        <div className="how-path">
          <div>
            <span className="path-icon"><Eye weight="duotone" /></span>
            <h3>分别注视</h3>
            <p>轻遮一只眼，按照屏幕提示完成左右眼阶段。</p>
          </div>
          <div>
            <span className="path-icon"><Leaf weight="duotone" /></span>
            <h3>慢慢放松</h3>
            <p>柔和图形平稳变化，不追求速度，也不强迫坚持。</p>
          </div>
          <div>
            <span className="path-icon"><CheckCircle weight="duotone" /></span>
            <h3>自动记录</h3>
            <p>完成即打卡，是否公开到社区完全由你决定。</p>
          </div>
        </div>
      </section>

      <section className="community-preview page-width">
        <div className="community-intro">
          <UsersThree weight="duotone" />
          <h2>有人和你一起，慢慢坚持。</h2>
          <p>社区只展示主动公开的打卡，不比较健康结果。</p>
          <Link className="secondary-button" to="/community">
            看看社区
          </Link>
        </div>
        <div className="preview-feed">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEncouragementChange={onEncouragementChange}
              />
            ))
          ) : (
            <div className="quiet-empty">
              <Leaf weight="duotone" />
              <p>第一批公开打卡正在路上。</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
