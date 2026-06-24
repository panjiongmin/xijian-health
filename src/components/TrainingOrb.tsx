import { Pause, Play } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

type TrainingOrbProps = {
  paused?: boolean;
  compact?: boolean;
  label?: string;
  cycleSeconds?: number;
  minScale?: number;
  onToggle?: () => void;
};

export function TrainingOrb({
  paused = false,
  compact = false,
  label = "跟随形状，慢慢注视",
  cycleSeconds = 6,
  minScale = 0.74,
  onToggle,
}: TrainingOrbProps) {
  const orbStyle = {
    "--orb-cycle": `${cycleSeconds}s`,
    "--orb-min-scale": String(minScale),
  } as CSSProperties;

  return (
    <div className={`training-orb-wrap${compact ? " compact" : ""}`}>
      <div className="orb-stage" aria-label={label}>
        <div className={`training-orb${paused ? " paused" : ""}`} style={orbStyle}>
          <span className="landolt-c" aria-hidden="true" />
          <span className="focus-point" aria-hidden="true" />
        </div>
      </div>
      <div className="orb-caption">
        <span>{label}</span>
        {onToggle && (
          <button
            type="button"
            className="orb-control"
            onClick={onToggle}
            aria-label={paused ? "继续预览" : "暂停预览"}
          >
            {paused ? <Play weight="fill" /> : <Pause weight="fill" />}
          </button>
        )}
      </div>
    </div>
  );
}
