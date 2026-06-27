import {
  ArrowsInSimple,
  ArrowsOutSimple,
  ArrowLeft,
  Check,
  CheckCircle,
  Eye,
  Pause,
  Play,
  ShieldCheck,
  SpeakerHigh,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth-context";
import { TrainingOrb } from "../components/TrainingOrb";
import type { TrainingCompleteResult } from "../types";

type TrainingPhase = "ready" | "left" | "switch" | "right" | "relax" | "complete";
type TrainingPreference = {
  cycleSeconds: number;
  minScale: number;
  voiceAssist: boolean;
};

const phaseDuration: Record<Exclude<TrainingPhase, "ready" | "complete">, number> = {
  left: 60,
  switch: 10,
  right: 60,
  relax: 30,
};

const DEFAULT_TRAINING_PREFERENCE: TrainingPreference = {
  cycleSeconds: 6,
  minScale: 0.74,
  voiceAssist: false,
};

const TRAINING_PREFERENCE_KEY = "xijian-training-preference";
const CYCLE_SECONDS_MIN = 1;
const CYCLE_SECONDS_MAX = 20;
const MIN_SCALE_MIN = 0.2;
const MIN_SCALE_MAX = 1.1;

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizePreference(value: Partial<TrainingPreference>): TrainingPreference {
  const voiceAssist = typeof value.voiceAssist === "boolean"
    ? value.voiceAssist
    : DEFAULT_TRAINING_PREFERENCE.voiceAssist;
  return {
    cycleSeconds: clampNumber(
      Number(value.cycleSeconds ?? DEFAULT_TRAINING_PREFERENCE.cycleSeconds),
      CYCLE_SECONDS_MIN,
      CYCLE_SECONDS_MAX,
      DEFAULT_TRAINING_PREFERENCE.cycleSeconds,
    ),
    minScale: clampNumber(
      Number(value.minScale ?? DEFAULT_TRAINING_PREFERENCE.minScale),
      MIN_SCALE_MIN,
      MIN_SCALE_MAX,
      DEFAULT_TRAINING_PREFERENCE.minScale,
    ),
    voiceAssist,
  };
}

function formatCycleLabel(value: number): string {
  return value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function loadTrainingPreference(): TrainingPreference {
  try {
    const stored = localStorage.getItem(TRAINING_PREFERENCE_KEY);
    if (!stored) return DEFAULT_TRAINING_PREFERENCE;
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_TRAINING_PREFERENCE;
    return normalizePreference(parsed as Partial<TrainingPreference>);
  } catch {
    return DEFAULT_TRAINING_PREFERENCE;
  }
}

const phaseCopy: Record<Exclude<TrainingPhase, "ready" | "complete">, { title: string; instruction: string }> = {
  left: { title: "左眼专注", instruction: "轻遮右眼，注视中心的小点" },
  switch: { title: "准备换眼", instruction: "放下双手，眨眨眼睛" },
  right: { title: "右眼专注", instruction: "轻遮左眼，继续跟随节奏" },
  relax: { title: "双眼放松", instruction: "自然睁开双眼，然后望向远处实物" },
};

const activePhases: Array<Exclude<TrainingPhase, "ready" | "complete">> = [
  "left",
  "switch",
  "right",
  "relax",
];

export function TrainPage() {
  const { user } = useAuth();
  const location = useLocation();
  const demoMode = import.meta.env.DEV && new URLSearchParams(location.search).get("demo") === "1";
  const durations = useMemo(
    () => (demoMode ? { left: 2, switch: 2, right: 2, relax: 2 } : phaseDuration),
    [demoMode],
  );
  const [phase, setPhase] = useState<TrainingPhase>("ready");
  const [seconds, setSeconds] = useState(durations.left);
  const [paused, setPaused] = useState(false);
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [result, setResult] = useState<TrainingCompleteResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");
  const [preference, setPreference] = useState<TrainingPreference>(() => loadTrainingPreference());
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const savedRef = useRef(false);

  const isActive = activePhases.includes(phase as Exclude<TrainingPhase, "ready" | "complete">);
  const currentCopy = isActive
    ? phaseCopy[phase as Exclude<TrainingPhase, "ready" | "complete">]
    : null;
  const activeIndex = isActive
    ? activePhases.indexOf(phase as Exclude<TrainingPhase, "ready" | "complete">)
    : 0;
  const cycleLabel = formatCycleLabel(preference.cycleSeconds);
  const minCirclePercent = Math.round(preference.minScale * 100);

  useEffect(() => {
    try {
      localStorage.setItem(TRAINING_PREFERENCE_KEY, JSON.stringify(preference));
    } catch {
      // Preference persistence is optional. Training should still work if storage is blocked.
    }
  }, [preference]);

  useEffect(() => {
    setFullscreenSupported(Boolean(document.documentElement.requestFullscreen));
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const updatePreference = (value: Partial<TrainingPreference>) => {
    setPreference((current) => normalizePreference({ ...current, ...value }));
  };

  const adjustCycleSeconds = (delta: number) => {
    setPreference((current) => normalizePreference({ ...current, cycleSeconds: current.cycleSeconds + delta }));
  };

  const adjustMinScale = (delta: number) => {
    setPreference((current) => normalizePreference({ ...current, minScale: current.minScale + delta }));
  };

  const cancelSpeech = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speakInstruction = useCallback((message: string) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "zh-CN";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const requestFullscreen = async () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setError("浏览器没有进入全屏，你可以在训练中手动点击全屏按钮。");
      }
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setError("当前浏览器暂时无法切换全屏。");
    }
  };

  const exitFullscreenQuietly = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  const start = () => {
    setError("");
    void requestFullscreen();
    setPhase("left");
    setSeconds(durations.left);
    setPaused(false);
    savedRef.current = false;
  };

  const reset = () => {
    exitFullscreenQuietly();
    cancelSpeech();
    setPhase("ready");
    setSeconds(durations.left);
    setPaused(false);
    setResult(null);
    setShared(false);
    setShareNote("");
    savedRef.current = false;
  };

  const advance = useCallback(() => {
    const index = activePhases.indexOf(phase as Exclude<TrainingPhase, "ready" | "complete">);
    const next = activePhases[index + 1];
    if (next) {
      setPhase(next);
      setSeconds(durations[next]);
    } else {
      setPhase("complete");
      setPaused(false);
    }
  }, [durations, phase]);

  useEffect(() => {
    if (!isActive || paused) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isActive, paused, phase]);

  useEffect(() => {
    if (!isActive || !preference.voiceAssist || paused || !currentCopy) {
      if (paused || !preference.voiceAssist || !isActive) cancelSpeech();
      return;
    }
    speakInstruction(`${currentCopy.title}。${currentCopy.instruction}`);
  }, [cancelSpeech, currentCopy, isActive, paused, phase, preference.voiceAssist, speakInstruction]);

  useEffect(() => {
    if (isActive && seconds === 0) advance();
  }, [advance, isActive, seconds]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && isActive) setPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isActive]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isActive) return;
      if (event.code === "Space") {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.code === "Escape") {
        setPaused(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive]);

  useEffect(() => {
    if (phase !== "complete" || savedRef.current) return;
    exitFullscreenQuietly();
    cancelSpeech();
    savedRef.current = true;
    const save = async () => {
      setSaving(true);
      setError("");
      if (!user) {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem("xijian-guest-checkin", today);
        setSaving(false);
        return;
      }
      try {
        const data = await apiRequest<TrainingCompleteResult>("/api/training/complete", {
          method: "POST",
          body: JSON.stringify({ durationSec: 160, clientSessionId: crypto.randomUUID() }),
        });
        setResult(data);
      } catch {
        setError("训练已经完成，但记录暂时没有同步成功。你可以稍后再试。");
      } finally {
        setSaving(false);
      }
    };
    void save();
  }, [cancelSpeech, exitFullscreenQuietly, phase, user]);

  const publish = async () => {
    if (!result || sharing) return;
    setSharing(true);
    setError("");
    try {
      await apiRequest("/api/community/posts", {
        method: "POST",
        body: JSON.stringify({
          checkinId: result.checkin.id,
          note: shareNote,
          showStreak: true,
          showWeekCount: true,
          showTotalCount: true,
        }),
      });
      setShared(true);
      setShowShare(false);
    } catch {
      setError("发布没有成功，请稍后再试。");
    } finally {
      setSharing(false);
    }
  };

  if (isActive && currentCopy) {
    return (
      <div className={`training-fullscreen immersive${preference.voiceAssist ? " voice-mode" : ""}`}>
        <header className="training-header">
          <button type="button" className="icon-button" onClick={() => setPaused(true)} aria-label="退出训练">
            <X />
          </button>
          <div className="phase-dots" aria-label={`训练阶段 ${activeIndex + 1}，共 4 阶段`}>
            {activePhases.map((item, index) => (
              <i key={item} className={index <= activeIndex ? "active" : ""} />
            ))}
          </div>
          <div className="training-header-actions">
            {fullscreenSupported && (
              <button
                type="button"
                className="training-fullscreen-button"
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
              >
                {isFullscreen ? <ArrowsInSimple /> : <ArrowsOutSimple />}
                <span>{isFullscreen ? "退出全屏" : "全屏"}</span>
              </button>
            )}
            <span className="training-time">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
          </div>
        </header>

        <div className="training-stage">
          <div className="voice-training-status training-hud" aria-live="polite">
            {preference.voiceAssist && <SpeakerHigh weight="duotone" />}
            <span>{currentCopy.title}</span>
            <small>{currentCopy.instruction}</small>
          </div>
          <TrainingOrb
            paused={paused || phase === "switch"}
            label={currentCopy.instruction}
            cycleSeconds={preference.cycleSeconds}
            minScale={preference.minScale}
          />
        </div>

        <footer className="training-controls">
          <button type="button" className="pause-button" onClick={() => setPaused((value) => !value)}>
            {paused ? <Play weight="fill" /> : <Pause weight="fill" />}
            {paused ? "继续" : "暂停"}
          </button>
          <button type="button" className="discomfort-button" onClick={() => { setPaused(true); setError("如果出现眼痛、明显头晕或持续重影，请停止训练并寻求专业帮助。"); }}>
            <WarningCircle />
            我感到不适
          </button>
        </footer>

        {paused && (
          <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="训练已暂停">
            <div>
              <Pause weight="duotone" />
              <h2>已经暂停</h2>
              {error && <p className="safety-message">{error}</p>}
              <button type="button" className="primary-button" onClick={() => { setError(""); setPaused(false); }}>
                继续训练
              </button>
              <button type="button" className="text-button" onClick={reset}>
                退出本次训练
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="training-result page-width">
        <CheckCircle weight="duotone" />
        <span className="eyebrow">今日完成</span>
        <h1>双眼都休息了一会儿。</h1>
        <p>{saving ? "正在保存记录" : user ? "打卡已经保存到你的记录。" : "本次已保存在这台设备，登录后可以长期同步。"}</p>
        <div className="result-stats">
          <div><strong>2:40</strong><span>本次用时</span></div>
          <div><strong>{result?.summary.weekCount ?? 1}</strong><span>近 7 天完成</span></div>
          <div><strong>{result?.summary.streak ?? 1}</strong><span>连续记录</span></div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="result-actions">
          {user ? (
            shared ? (
              <Link className="primary-button" to="/community"><UsersThree /> 查看社区动态</Link>
            ) : (
              <button type="button" className="primary-button" onClick={() => setShowShare(true)} disabled={!result}>
                <UsersThree /> 发布到社区
              </button>
            )
          ) : (
            <Link className="primary-button" to="/register?next=/records">创建账号并保存</Link>
          )}
          <button type="button" className="secondary-button" onClick={reset}>再做一次</button>
        </div>

        {showShare && result && (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowShare(false)}>
            <div className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" className="icon-button close-modal" onClick={() => setShowShare(false)} aria-label="关闭"><X /></button>
              <h2 id="share-title">发布今日打卡</h2>
              <p>将公开：松眸训练、连续天数、近 7 天次数和累计记录。</p>
              <label>
                <span>写一句感受，可不填</span>
                <textarea value={shareNote} onChange={(event) => setShareNote(event.target.value)} maxLength={80} rows={3} placeholder="例如：做完以后，准备去窗边看看远处。" />
              </label>
              <div className="privacy-reminder"><ShieldCheck /><span>舒适度、邮箱和训练明细不会公开。</span></div>
              <button type="button" className="primary-button full" onClick={() => void publish()} disabled={sharing}>{sharing ? "正在发布" : "确认发布"}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="train-ready page-width">
      <div className="ready-copy">
        <button type="button" className="back-link" onClick={() => history.back()}><ArrowLeft /> 返回</button>
        <span className="eyebrow">松眸训练</span>
        <h1>准备好后，我们慢慢开始。</h1>
        <p>共四个阶段，大约三分钟。训练中可以随时暂停或退出。</p>
        <div className="safety-list">
          <div><Check /><span>保持日常坐姿和自然观看距离</span></div>
          <div><Check /><span>遮挡眼睛时不要按压眼球</span></div>
          <div><Check /><span>出现明显不适时立即停止</span></div>
        </div>
        <div className="training-preference-panel" aria-label="训练参数">
          <div className="preference-heading">
            <span>训练参数</span>
            <strong>速度 {cycleLabel} 秒，最小 {minCirclePercent}%</strong>
          </div>
          <div className="preference-slider">
            <label htmlFor="orb-cycle-seconds">
              <strong>C 形标速度</strong>
              <small>1 到 20 秒一轮，数值越小越快</small>
            </label>
            <div className="preference-range-stack">
              <input
                id="orb-cycle-seconds"
                type="range"
                min={CYCLE_SECONDS_MIN}
                max={CYCLE_SECONDS_MAX}
                step="0.25"
                value={preference.cycleSeconds}
                onChange={(event) => updatePreference({ cycleSeconds: Number(event.target.value) })}
                aria-valuetext={`${cycleLabel} 秒一轮`}
              />
              <div className="preference-stepper" aria-label="调整 C 形标速度">
                <button type="button" onClick={() => adjustCycleSeconds(1)}>慢一点</button>
                <button type="button" onClick={() => adjustCycleSeconds(-0.5)}>快一点</button>
              </div>
            </div>
          </div>
          <div className="preference-slider">
            <label htmlFor="orb-min-scale">
              <strong>最小可见 C 形</strong>
              <small>20% 到 110%，敏感时可以调大</small>
            </label>
            <div className="preference-range-stack">
              <input
                id="orb-min-scale"
                type="range"
                min={MIN_SCALE_MIN}
                max={MIN_SCALE_MAX}
                step="0.01"
                value={preference.minScale}
                onChange={(event) => updatePreference({ minScale: Number(event.target.value) })}
                aria-valuetext={`收缩到 ${minCirclePercent}%`}
              />
              <div className="preference-stepper" aria-label="调整最小可见 C 形">
                <button type="button" onClick={() => adjustMinScale(-0.05)}>小一点</button>
                <button type="button" onClick={() => adjustMinScale(0.05)}>大一点</button>
              </div>
            </div>
          </div>
          <label className="voice-assist-toggle">
            <input
              type="checkbox"
              checked={preference.voiceAssist}
              onChange={(event) => updatePreference({ voiceAssist: event.target.checked })}
            />
            <span className="voice-assist-icon" aria-hidden="true"><SpeakerHigh weight="duotone" /></span>
            <span>
              <strong>语音帮助模式</strong>
              <small>开始后直接请求全屏，训练画布放大，阶段提示用语音播报。</small>
            </span>
          </label>
        </div>
        <label className="checkbox-field safety-check">
          <input type="checkbox" checked={safetyAccepted} onChange={(event) => setSafetyAccepted(event.target.checked)} />
          <span>我已了解：这是一项一般性的用眼休息练习，不替代医疗诊断或治疗。</span>
        </label>
        <button type="button" className="primary-button" onClick={start} disabled={!safetyAccepted}>
          开始训练
          <Play weight="fill" />
        </button>
      </div>
      <div className="ready-visual">
        <TrainingOrb
          compact
          label={`练习预览：${cycleLabel} 秒一轮，最小 ${minCirclePercent}%`}
          cycleSeconds={preference.cycleSeconds}
          minScale={preference.minScale}
        />
        <div className="duration-note"><Eye weight="duotone" /><span>左右眼分别进行，双眼放松结束</span></div>
      </div>
    </div>
  );
}
