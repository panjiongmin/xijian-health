import {
  Armchair,
  ArrowRight,
  Brain,
  ForkKnife,
  Eye,
  MoonStars,
  PersonSimpleTaiChi,
  Wind,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function DiscoverPage() {
  return (
    <div className="discover-page page-width">
      <header className="page-heading">
        <span className="eyebrow">轻养计划</span>
        <h1>从一件小事开始。</h1>
        <p>首个模块已经开放，其他练习会在验证体验后逐步加入。</p>
      </header>

      <section className="module-grid">
        <article className="module-featured">
          <div className="module-icon"><Eye weight="duotone" /></div>
          <div>
            <span>已经开放</span>
            <h2>松眸训练</h2>
            <p>左右眼专注、大小节奏变化和每日打卡。</p>
            <Link to="/train">开始训练 <ArrowRight /></Link>
          </div>
        </article>
        <article className="module-coming wind-module">
          <Wind weight="duotone" />
          <h2>呼吸放松</h2>
          <p>跟随简单节拍，留下一小段安静。</p>
          <span>即将开放</span>
        </article>
        <Link className="module-coming memory-module" to="/memory">
          <Brain weight="duotone" />
          <h2>记忆力训练</h2>
          <p>主动回忆、间隔复习和记忆宫殿，先从一张高质量卡片开始。</p>
          <span>开始训练 <ArrowRight /></span>
        </Link>
        <article className="module-coming">
          <PersonSimpleTaiChi weight="duotone" />
          <h2>颈肩舒展</h2>
          <p>久坐间隙里的轻量活动引导。</p>
          <span>即将开放</span>
        </article>
        <Link className="module-coming nutrition-module" to="/nutrition">
          <ForkKnife weight="duotone" />
          <h2>饮食健康</h2>
          <p>先从识别常见糖油混合物开始，建立更轻的加餐习惯。</p>
          <span>查看清单 <ArrowRight /></span>
        </Link>
        <article className="module-coming compact-module">
          <Armchair weight="duotone" />
          <div><h2>久坐提醒</h2><span>即将开放</span></div>
        </article>
        <article className="module-coming compact-module moon-module">
          <MoonStars weight="duotone" />
          <div><h2>睡前整理</h2><span>即将开放</span></div>
        </article>
      </section>
    </div>
  );
}
