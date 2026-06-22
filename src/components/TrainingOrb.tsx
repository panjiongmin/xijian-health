import { Pause, Play } from "@phosphor-icons/react";

type TrainingOrbProps = {
  paused?: boolean;
  compact?: boolean;
  label?: string;
  onToggle?: () => void;
};

export function TrainingOrb({
  paused = false,
  compact = false,
  label = "跟随形状，慢慢注视",
  onToggle,
}: TrainingOrbProps) {
  return (
    <div className={`training-orb-wrap${compact ? " compact" : ""}`}>
      <div className="orb-stage" aria-label={label}>
        <div className={`training-orb${paused ? " paused" : ""}`}>
          <span className="focus-point" />
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
