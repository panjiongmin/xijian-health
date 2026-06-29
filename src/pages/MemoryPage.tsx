import {
  Brain,
  Cards,
  CheckCircle,
  Eye,
  LockKey,
  MapPin,
  PlayCircle,
  Plus,
  SealCheck,
  Sparkle,
  Timer,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import type {
  MemoryDeck,
  MemoryCardDraft,
  MemoryItem,
  MemoryPalace,
  MemorySessionResult,
  MemorySummary,
} from "../types";

const emptySummary: MemorySummary = {
  totalItems: 0,
  dueCount: 0,
  reviewedToday: 0,
  rememberedToday: 0,
  forgottenToday: 0,
  retention7d: 0,
  streak: 0,
  recentDates: [],
};

const categoryOptions = [
  { value: "learning", label: "学习" },
  { value: "work", label: "工作" },
  { value: "life", label: "生活" },
  { value: "health", label: "养生" },
  { value: "language", label: "语言" },
];

const sceneOptions = [
  { value: "home", label: "家中房间" },
  { value: "route", label: "熟悉路线" },
  { value: "garden", label: "庭院花园" },
  { value: "body", label: "身体路径" },
];

const sampleCards = [
  {
    prompt: "什么是主动回忆？",
    answer: "先不看答案，主动从记忆里提取信息；提取本身会增强之后再次想起的概率。",
    tags: "学习法,主动回忆",
  },
  {
    prompt: "间隔复习为什么比临时抱佛脚更稳？",
    answer: "把复习分散到不同时间点，会制造适度遗忘与重新提取，让记忆保持更久。",
    tags: "学习法,间隔复习",
  },
  {
    prompt: "记忆宫殿的第一步是什么？",
    answer: "选择一个非常熟悉的空间或路线，再按固定顺序设置地点。",
    tags: "位置法,记忆宫殿",
  },
];

const ratingOptions = [
  { value: 0, label: "忘记", note: "明天再见", icon: XCircle },
  { value: 1, label: "困难", note: "缩短间隔", icon: Eye },
  { value: 2, label: "记得", note: "正常推进", icon: CheckCircle },
  { value: 3, label: "轻松", note: "拉长间隔", icon: SealCheck },
];

function clientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDueTime(value: string) {
  if (!value) return "待复习";
  return value.replace("T", " ").slice(0, 16);
}

function categoryLabel(value: string) {
  return categoryOptions.find((item) => item.value === value)?.label ?? "学习";
}

type CardForm = {
  deckName: string;
  prompt: string;
  answer: string;
  category: string;
  tags: string;
};

type PalaceForm = {
  name: string;
  sceneType: string;
};

type LocusDraft = {
  title: string;
  description: string;
  itemId: string;
};

export function MemoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<MemorySummary>(emptySummary);
  const [decks, setDecks] = useState<MemoryDeck[]>([]);
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [dueItems, setDueItems] = useState<MemoryItem[]>([]);
  const [palaces, setPalaces] = useState<MemoryPalace[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [savingPalace, setSavingPalace] = useState(false);
  const [savingLocusId, setSavingLocusId] = useState("");
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [aiSource, setAiSource] = useState("");
  const [aiDrafts, setAiDrafts] = useState<MemoryCardDraft[]>([]);
  const [generatingPalaceId, setGeneratingPalaceId] = useState("");
  const [palacePreferences, setPalacePreferences] = useState<Record<string, string>>({});
  const [cardForm, setCardForm] = useState<CardForm>({
    deckName: "默认卡片",
    prompt: "",
    answer: "",
    category: "learning",
    tags: "",
  });
  const [palaceForm, setPalaceForm] = useState<PalaceForm>({
    name: "我的第一座记忆宫殿",
    sceneType: "home",
  });
  const [locusDrafts, setLocusDrafts] = useState<Record<string, LocusDraft>>({});
  const [trainingMode, setTrainingMode] = useState<"idle" | "training" | "complete">("idle");
  const [queue, setQueue] = useState<MemoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(0);
  const [itemStartedAt, setItemStartedAt] = useState(0);
  const [trainingStats, setTrainingStats] = useState({ remembered: 0, forgotten: 0 });

  const currentItem = queue[currentIndex];
  const progressPercent = useMemo(() => {
    if (queue.length === 0) return 0;
    return Math.round((currentIndex / queue.length) * 100);
  }, [currentIndex, queue.length]);

  const loadMemory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [summaryResult, decksResult, itemsResult, dueResult, palacesResult] = await Promise.all([
        apiRequest<MemorySummary>("/api/memory/summary"),
        apiRequest<{ decks: MemoryDeck[] }>("/api/memory/decks"),
        apiRequest<{ items: MemoryItem[] }>("/api/memory/items?limit=80"),
        apiRequest<{ items: MemoryItem[]; summary: MemorySummary }>("/api/memory/items/due?limit=20"),
        apiRequest<{ palaces: MemoryPalace[] }>("/api/memory/palaces"),
      ]);
      setSummary(summaryResult);
      setDecks(decksResult.decks);
      setItems(itemsResult.items);
      setDueItems(dueResult.items);
      setPalaces(palacesResult.palaces);
    } catch {
      setError("记忆训练数据暂时没有加载成功，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMemory();
  }, [loadMemory]);

  const createCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingCard) return;
    setSavingCard(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ item: MemoryItem | null; summary: MemorySummary }>("/api/memory/items", {
        method: "POST",
        body: JSON.stringify(cardForm),
      });
      if (result.item) {
        setItems((value) => [result.item as MemoryItem, ...value]);
        setDueItems((value) => [result.item as MemoryItem, ...value]);
      }
      setSummary(result.summary);
      setNotice("记忆卡片已加入今日复习。");
      setCardForm((value) => ({ ...value, prompt: "", answer: "", tags: "" }));
      void loadMemory();
    } catch {
      setError("卡片没有保存成功，请检查问题和答案。");
    } finally {
      setSavingCard(false);
    }
  };

  const saveDraftCard = async (draft: MemoryCardDraft) => {
    if (savingDrafts) return;
    setSavingDrafts(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ item: MemoryItem | null; summary: MemorySummary }>("/api/memory/items", {
        method: "POST",
        body: JSON.stringify({
          deckName: cardForm.deckName || "AI 卡片",
          prompt: draft.prompt,
          answer: draft.answer,
          category: cardForm.category,
          tags: draft.tags.join(","),
        }),
      });
      if (result.item) {
        setItems((value) => [result.item as MemoryItem, ...value]);
        setDueItems((value) => [result.item as MemoryItem, ...value]);
      }
      setSummary(result.summary);
      setAiDrafts((value) => value.filter((item) => item.prompt !== draft.prompt));
      setNotice("AI 卡片已保存并进入今日复习。");
    } catch {
      setError("这张 AI 卡片暂时没有保存成功。");
    } finally {
      setSavingDrafts(false);
    }
  };

  const saveAllDraftCards = async () => {
    if (aiDrafts.length === 0 || savingDrafts) return;
    setSavingDrafts(true);
    setError("");
    setNotice("");
    try {
      const created: MemoryItem[] = [];
      let nextSummary = summary;
      for (const draft of aiDrafts) {
        const result = await apiRequest<{ item: MemoryItem | null; summary: MemorySummary }>("/api/memory/items", {
          method: "POST",
          body: JSON.stringify({
            deckName: cardForm.deckName || "AI 卡片",
            prompt: draft.prompt,
            answer: draft.answer,
            category: cardForm.category,
            tags: draft.tags.join(","),
          }),
        });
        if (result.item) created.push(result.item);
        nextSummary = result.summary;
      }
      if (created.length > 0) {
        setItems((value) => [...created, ...value]);
        setDueItems((value) => [...created, ...value]);
      }
      setSummary(nextSummary);
      setAiDrafts([]);
      setNotice(`已保存 ${created.length} 张 AI 卡片。`);
      void loadMemory();
    } catch {
      setError("部分 AI 卡片没有保存成功，请稍后再试。");
    } finally {
      setSavingDrafts(false);
    }
  };

  const generateDraftCards = async () => {
    if (generatingDrafts) return;
    setGeneratingDrafts(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ drafts: MemoryCardDraft[] }>("/api/memory/ai/card-drafts", {
        method: "POST",
        body: JSON.stringify({
          source: aiSource,
          count: 5,
          category: cardForm.category,
        }),
      });
      setAiDrafts(result.drafts);
      setNotice("AI 已提炼出一组主动回忆卡片。");
    } catch {
      setError("AI 卡片暂时没有生成成功，请确认 API Key 已配置，或换一段更清晰的材料。");
    } finally {
      setGeneratingDrafts(false);
    }
  };

  const deleteCard = async (itemId: string) => {
    if (!window.confirm("确定归档这张记忆卡片吗？")) return;
    setError("");
    try {
      await apiRequest<void>(`/api/memory/items/${itemId}`, { method: "DELETE" });
      setItems((value) => value.filter((item) => item.id !== itemId));
      setDueItems((value) => value.filter((item) => item.id !== itemId));
      setSummary((value) => ({
        ...value,
        totalItems: Math.max(0, value.totalItems - 1),
        dueCount: Math.max(0, value.dueCount - 1),
      }));
    } catch {
      setError("这张卡片暂时没有归档成功。");
    }
  };

  const startTraining = () => {
    if (dueItems.length === 0) {
      setNotice("今天暂时没有到期卡片。可以先新增 1 张卡片，它会立刻进入复习。");
      return;
    }
    setQueue(dueItems.slice(0, 12));
    setCurrentIndex(0);
    setAnswerVisible(false);
    setTrainingStats({ remembered: 0, forgotten: 0 });
    setSessionStartedAt(Date.now());
    setItemStartedAt(Date.now());
    setTrainingMode("training");
    setNotice("");
    setError("");
  };

  const completeTraining = async (remembered: number, forgotten: number) => {
    try {
      const result = await apiRequest<MemorySessionResult>("/api/memory/sessions/complete", {
        method: "POST",
        body: JSON.stringify({
          mode: "recall",
          itemCount: queue.length,
          rememberedCount: remembered,
          forgottenCount: forgotten,
          durationSec: Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000)),
          clientSessionId: clientId("memory"),
        }),
      });
      setSummary(result.summary);
      setTrainingMode("complete");
      void loadMemory();
    } catch {
      setTrainingMode("complete");
      setError("复习已完成，但训练汇总暂时没有保存成功。");
    }
  };

  const submitRating = async (rating: number) => {
    if (!currentItem || reviewing) return;
    setReviewing(true);
    setError("");
    try {
      await apiRequest("/api/memory/reviews", {
        method: "POST",
        body: JSON.stringify({
          itemId: currentItem.id,
          rating,
          responseMs: Math.max(0, Date.now() - itemStartedAt),
        }),
      });
      const nextStats = {
        remembered: trainingStats.remembered + (rating >= 2 ? 1 : 0),
        forgotten: trainingStats.forgotten + (rating === 0 ? 1 : 0),
      };
      setTrainingStats(nextStats);
      if (currentIndex + 1 >= queue.length) {
        await completeTraining(nextStats.remembered, nextStats.forgotten);
      } else {
        setCurrentIndex((value) => value + 1);
        setAnswerVisible(false);
        setItemStartedAt(Date.now());
      }
    } catch {
      setError("这次反馈没有保存成功，请再点一次。");
    } finally {
      setReviewing(false);
    }
  };

  const createPalace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingPalace) return;
    setSavingPalace(true);
    setError("");
    try {
      const result = await apiRequest<{ palace: MemoryPalace | null }>("/api/memory/palaces", {
        method: "POST",
        body: JSON.stringify({ ...palaceForm, useTemplate: true }),
      });
      if (result.palace) setPalaces((value) => [result.palace as MemoryPalace, ...value]);
      setNotice("记忆宫殿已创建，并自动放入了 5 个路径点。");
    } catch {
      setError("记忆宫殿暂时没有创建成功。");
    } finally {
      setSavingPalace(false);
    }
  };

  const updateLocusDraft = (palaceId: string, patch: Partial<LocusDraft>) => {
    const emptyDraft = { title: "", description: "", itemId: "" };
    setLocusDrafts((value) => ({
      ...value,
      [palaceId]: { ...emptyDraft, ...(value[palaceId] ?? {}), ...patch },
    }));
  };

  const addLocus = async (palaceId: string) => {
    const draft = locusDrafts[palaceId] ?? { title: "", description: "", itemId: "" };
    if (!draft.title.trim() || savingLocusId) return;
    setSavingLocusId(palaceId);
    setError("");
    try {
      const result = await apiRequest<{ locus: MemoryPalace["loci"][number] | null }>(
        `/api/memory/palaces/${palaceId}/loci`,
        {
          method: "POST",
          body: JSON.stringify(draft),
        },
      );
      if (result.locus) {
        setPalaces((value) =>
          value.map((palace) =>
            palace.id === palaceId
              ? {
                  ...palace,
                  lociCount: palace.lociCount + 1,
                  loci: [...palace.loci, result.locus as MemoryPalace["loci"][number]],
                }
              : palace,
          ),
        );
      }
      updateLocusDraft(palaceId, { title: "", description: "", itemId: "" });
    } catch {
      setError("路径点暂时没有添加成功。");
    } finally {
      setSavingLocusId("");
    }
  };

  const updatePalacePreference = (palaceId: string, value: string) => {
    setPalacePreferences((items) => ({ ...items, [palaceId]: value }));
  };

  const generatePalaceView = async (palaceId: string) => {
    if (generatingPalaceId) return;
    setGeneratingPalaceId(palaceId);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ palace: MemoryPalace | null }>(`/api/memory/palaces/${palaceId}/generate-view`, {
        method: "POST",
        body: JSON.stringify({ preference: palacePreferences[palaceId] ?? "" }),
      });
      if (result.palace) {
        setPalaces((value) => value.map((palace) => palace.id === palaceId ? result.palace as MemoryPalace : palace));
      }
      setNotice("记忆宫殿空间视图已生成，并保存到 R2。");
    } catch {
      setError("空间视图暂时没有生成成功，请确认火山方舟 API Key 与模型权限。");
    } finally {
      setGeneratingPalaceId("");
    }
  };

  if (authLoading) return <div className="page-loading" />;

  if (!user) {
    return (
      <div className="auth-required page-width">
        <LockKey weight="duotone" />
        <h1>登录后开启记忆训练</h1>
        <p>记忆卡片、复习间隔和宫殿路径都会保存在你的账号里，不会自动公开到社区。</p>
        <Link className="primary-button" to="/login?next=/memory">
          登录后开始
        </Link>
      </div>
    );
  }

  return (
    <div className="memory-page page-width">
      <header className="page-heading memory-heading">
        <span className="eyebrow">学术认证训练</span>
        <h1>把“记住”拆成可练习的动作。</h1>
        <p>基于主动回忆、间隔复习与位置法的组合：先提取，再反馈，再安排下一次见面。</p>
      </header>

      {notice && <div className="memory-toast success">{notice}</div>}
      {error && <div className="memory-toast error">{error}</div>}

      <section className="memory-hero-card">
        <div className="memory-hero-copy">
          <span className="memory-orb"><Brain weight="duotone" /></span>
          <div>
            <h2>今日主动回忆</h2>
            <p>先不要看答案。让大脑做一次“主动提取”，训练价值就在这一下用力里。</p>
          </div>
        </div>
        <div className="memory-hero-action">
          <button type="button" className="primary-button" onClick={startTraining} disabled={loading || dueItems.length === 0}>
            <PlayCircle weight="bold" />
            开始复习
          </button>
          <span>{summary.dueCount} 张到期 · 今日已练 {summary.reviewedToday} 张</span>
        </div>
      </section>

      <section className="memory-summary-grid" aria-label="记忆训练概览">
        <div>
          <Cards weight="duotone" />
          <strong>{summary.totalItems}</strong>
          <span>总卡片</span>
        </div>
        <div>
          <Timer weight="duotone" />
          <strong>{summary.dueCount}</strong>
          <span>今日待复习</span>
        </div>
        <div>
          <CheckCircle weight="duotone" />
          <strong>{summary.retention7d}%</strong>
          <span>近 7 日记得率</span>
        </div>
        <div>
          <Sparkle weight="duotone" />
          <strong>{summary.streak}</strong>
          <span>连续训练</span>
        </div>
      </section>

      {trainingMode !== "idle" && (
        <section className={`memory-training-room ${trainingMode === "complete" ? "complete" : ""}`}>
          {trainingMode === "complete" ? (
            <div className="memory-complete-card">
              <div className="memory-complete-burst" aria-hidden="true">
                <SealCheck weight="duotone" />
              </div>
              <span className="eyebrow">完成反馈</span>
              <h2>这轮复习已收束。</h2>
              <p>
                记得 {trainingStats.remembered} 张，忘记 {trainingStats.forgotten} 张。忘记不是失败，它只是告诉系统“这张明天再来”。
              </p>
              <button type="button" className="secondary-button" onClick={() => setTrainingMode("idle")}>
                回到记忆页
              </button>
            </div>
          ) : currentItem ? (
            <div className="memory-review-card">
              <div className="memory-review-top">
                <span>{currentIndex + 1} / {queue.length}</span>
                <div className="memory-progress"><span style={{ width: `${progressPercent}%` }} /></div>
              </div>
              <div className="memory-prompt">
                <small>{currentItem.deckName ?? "默认卡片"} · {categoryLabel(currentItem.category)}</small>
                <h2>{currentItem.prompt}</h2>
              </div>
              {answerVisible ? (
                <div className="memory-answer">
                  <span>答案</span>
                  <p>{currentItem.answer}</p>
                </div>
              ) : (
                <button type="button" className="memory-reveal-button" onClick={() => setAnswerVisible(true)}>
                  我已经在心里回答了，查看答案
                </button>
              )}
              {answerVisible && (
                <div className="memory-rating-grid">
                  {ratingOptions.map(({ value, label, note, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => void submitRating(value)} disabled={reviewing}>
                      <Icon weight="duotone" />
                      <strong>{label}</strong>
                      <span>{note}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      <section className="memory-evidence-grid">
        <article>
          <Brain weight="duotone" />
          <h3>主动回忆</h3>
          <p>先闭卷提取，再看答案反馈，避免只靠“看懂了”的熟悉感。</p>
        </article>
        <article>
          <Timer weight="duotone" />
          <h3>间隔复习</h3>
          <p>每次评分都会安排下一次复习，把努力分散到更适合巩固的时间点。</p>
        </article>
        <article>
          <MapPin weight="duotone" />
          <h3>位置法</h3>
          <p>把抽象内容绑定到熟悉地点，适合顺序、演讲、清单和复杂概念。</p>
        </article>
      </section>

      <section className="memory-ai-panel">
        <div className="memory-ai-copy">
          <Sparkle weight="duotone" />
          <div>
            <span className="eyebrow">AI 文字生成</span>
            <h2>把一段材料提炼成主动回忆卡片</h2>
            <p>粘贴文章、课程笔记或自己的摘录，AI 会尽量只基于原文生成可复述的问题和答案。</p>
          </div>
        </div>
        <div className="memory-ai-input">
          <textarea
            value={aiSource}
            onChange={(event) => setAiSource(event.target.value)}
            placeholder="例如：粘贴一段关于间隔复习、睡眠、饮食或课程知识的材料……"
            maxLength={4000}
          />
          <div className="memory-ai-actions">
            <span>{aiSource.length} / 4000</span>
            <button type="button" className="primary-button" onClick={() => void generateDraftCards()} disabled={generatingDrafts || aiSource.trim().length < 20}>
              {generatingDrafts ? "生成中" : "AI 提炼卡片"}
            </button>
          </div>
          {aiDrafts.length > 0 && (
            <div className="ai-draft-list">
              <div className="ai-draft-heading">
                <strong>生成草稿</strong>
                <button type="button" onClick={() => void saveAllDraftCards()} disabled={savingDrafts}>
                  全部保存
                </button>
              </div>
              {aiDrafts.map((draft) => (
                <article key={draft.prompt}>
                  <div>
                    <h3>{draft.prompt}</h3>
                    <p>{draft.answer}</p>
                    {draft.tags.length > 0 && <span>{draft.tags.join(" · ")}</span>}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setCardForm((value) => ({
                        ...value,
                        prompt: draft.prompt,
                        answer: draft.answer,
                        tags: draft.tags.join(","),
                      }))}
                    >
                      放入表单
                    </button>
                    <button type="button" onClick={() => void saveDraftCard(draft)} disabled={savingDrafts}>
                      保存
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="memory-workspace">
        <form className="memory-panel memory-create-card" onSubmit={(event) => void createCard(event)}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">卡片库</span>
              <h2>新增一张记忆卡片</h2>
            </div>
            <Plus weight="bold" />
          </div>
          <label>
            卡组
            <input value={cardForm.deckName} onChange={(event) => setCardForm((value) => ({ ...value, deckName: event.target.value }))} maxLength={40} />
          </label>
          <label>
            问题 / 提示
            <textarea value={cardForm.prompt} onChange={(event) => setCardForm((value) => ({ ...value, prompt: event.target.value }))} placeholder="例如：什么是间隔复习？" maxLength={180} required />
          </label>
          <label>
            答案
            <textarea value={cardForm.answer} onChange={(event) => setCardForm((value) => ({ ...value, answer: event.target.value }))} placeholder="用自己的话写下最短可复述答案。" maxLength={1000} required />
          </label>
          <div className="memory-form-row">
            <label>
              类目
              <select value={cardForm.category} onChange={(event) => setCardForm((value) => ({ ...value, category: event.target.value }))}>
                {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              标签
              <input value={cardForm.tags} onChange={(event) => setCardForm((value) => ({ ...value, tags: event.target.value }))} placeholder="逗号分隔" />
            </label>
          </div>
          <div className="sample-card-row">
            {sampleCards.map((sample) => (
              <button
                key={sample.prompt}
                type="button"
                onClick={() => setCardForm((value) => ({ ...value, ...sample }))}
              >
                填入示例
              </button>
            ))}
          </div>
          <button type="submit" className="primary-button" disabled={savingCard}>
            {savingCard ? "保存中" : "保存并进入复习"}
          </button>
        </form>

        <div className="memory-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">待复习</span>
              <h2>今天要见面的卡片</h2>
            </div>
            <Cards weight="duotone" />
          </div>
          {dueItems.length > 0 ? (
            <div className="memory-due-list">
              {dueItems.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.prompt}</strong>
                    <span>{item.deckName ?? "默认卡片"} · {formatDueTime(item.nextReviewAt)}</span>
                  </div>
                  <small>{item.reviewCount} 次</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="quiet-empty compact">
              <Brain weight="duotone" />
              <p>没有到期卡片。新增一张后，可以立刻开始第一轮主动回忆。</p>
            </div>
          )}
          <div className="deck-strip">
            {decks.length > 0 ? decks.map((deck) => (
              <span key={deck.id}>{deck.name} · {deck.itemCount}</span>
            )) : <span>还没有卡组</span>}
          </div>
        </div>
      </section>

      <section className="memory-card-library">
        <div className="section-heading">
          <h2>我的卡片</h2>
          <p>先用少量高质量卡片跑通习惯，再逐步把重要知识放进来。</p>
        </div>
        {items.length > 0 ? (
          <div className="memory-card-grid">
            {items.slice(0, 12).map((item) => (
              <article key={item.id}>
                <div>
                  <span>{item.deckName ?? "默认卡片"} · {categoryLabel(item.category)}</span>
                  <h3>{item.prompt}</h3>
                  <p>{item.answer}</p>
                </div>
                <div className="memory-card-meta">
                  <span>间隔 {item.intervalDays} 天</span>
                  <span>复习 {item.reviewCount} 次</span>
                  <button type="button" onClick={() => void deleteCard(item.id)} aria-label="归档卡片">
                    <Trash />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="quiet-empty">
            <Cards weight="duotone" />
            <p>还没有记忆卡片。可以先从上方示例开始。</p>
          </div>
        )}
      </section>

      <section className="memory-palace-section">
        <div className="section-heading">
          <h2>记忆宫殿</h2>
          <p>用熟悉的空间承接抽象知识。MVP 先做文字路径，后续可以接图片和更强的可视化。</p>
        </div>
        <div className="memory-palace-layout">
          <form className="memory-panel palace-create-card" onSubmit={(event) => void createPalace(event)}>
            <MapPin weight="duotone" />
            <h3>创建一座宫殿</h3>
            <label>
              名称
              <input value={palaceForm.name} onChange={(event) => setPalaceForm((value) => ({ ...value, name: event.target.value }))} maxLength={40} />
            </label>
            <label>
              场景
              <select value={palaceForm.sceneType} onChange={(event) => setPalaceForm((value) => ({ ...value, sceneType: event.target.value }))}>
                {sceneOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button type="submit" className="secondary-button" disabled={savingPalace}>
              {savingPalace ? "创建中" : "创建并生成路径"}
            </button>
          </form>

          <div className="palace-list">
            {palaces.length > 0 ? palaces.map((palace) => {
              const draft = locusDrafts[palace.id] ?? { title: "", description: "", itemId: "" };
              return (
                <article className="palace-card" key={palace.id}>
                  <div className="palace-card-heading">
                    <div>
                      <span>{sceneOptions.find((item) => item.value === palace.sceneType)?.label ?? "记忆场景"}</span>
                      <h3>{palace.name}</h3>
                    </div>
                    <strong>{palace.lociCount} 点</strong>
                  </div>
                  <div className={`palace-visual ${palace.imageUrl ? "" : "empty"}`}>
                    {palace.imageUrl ? (
                      <>
                        <img src={palace.imageUrl} alt={`${palace.name} 空间视图`} loading="lazy" decoding="async" />
                        {palace.layout?.points.map((point, index) => (
                          <button
                            key={`${point.locusId ?? point.title}-${index}`}
                            type="button"
                            className="palace-point"
                            style={{ left: `${point.x}%`, top: `${point.y}%` }}
                            title={point.hint || point.title}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </>
                    ) : (
                      <div>
                        <Sparkle weight="duotone" />
                        <p>还没有空间化视图。生成后会保存到 R2，并在这里叠加可点击路径点。</p>
                      </div>
                    )}
                  </div>
                  <div className="palace-generate-row">
                    <input
                      placeholder="空间风格偏好，可选：如书房、庭院、山间小屋"
                      value={palacePreferences[palace.id] ?? ""}
                      onChange={(event) => updatePalacePreference(palace.id, event.target.value)}
                    />
                    <button type="button" onClick={() => void generatePalaceView(palace.id)} disabled={generatingPalaceId === palace.id || palace.loci.length === 0}>
                      {generatingPalaceId === palace.id ? "生成中" : palace.imageUrl ? "重新生成空间图" : "生成空间图"}
                    </button>
                  </div>
                  <ol className="loci-list">
                    {palace.loci.map((locus) => (
                      <li key={locus.id}>
                        <span>{locus.positionOrder}</span>
                        <div>
                          <strong>{locus.title}</strong>
                          <p>{locus.description || "还没有描述"}</p>
                          {locus.prompt && <small>绑定：{locus.prompt}</small>}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="locus-create-row">
                    <input placeholder="新增地点" value={draft.title} onChange={(event) => updateLocusDraft(palace.id, { title: event.target.value })} />
                    <select value={draft.itemId} onChange={(event) => updateLocusDraft(palace.id, { itemId: event.target.value })}>
                      <option value="">不绑定卡片</option>
                      {items.slice(0, 40).map((item) => <option key={item.id} value={item.id}>{item.prompt}</option>)}
                    </select>
                    <button type="button" onClick={() => void addLocus(palace.id)} disabled={savingLocusId === palace.id}>
                      <Plus />
                    </button>
                  </div>
                  <input
                    className="locus-description-input"
                    placeholder="地点描述，可选"
                    value={draft.description}
                    onChange={(event) => updateLocusDraft(palace.id, { description: event.target.value })}
                  />
                </article>
              );
            }) : (
              <div className="quiet-empty">
                <MapPin weight="duotone" />
                <p>还没有宫殿。创建后系统会自动给你放入 5 个路径点。</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
