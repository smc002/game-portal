interface ProgressBarProps {
  current: number;
  max: number;
  color?: string;
  bgColor?: string;
  height?: number;
  showText?: boolean;
}

export function ProgressBar({
  current,
  max,
  color = '#22c55e',
  bgColor = '#374151',
  height = 8,
  showText = false,
}: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div className="w-full rounded-full overflow-hidden relative" style={{ backgroundColor: bgColor, height }}>
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
      {showText && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold"
          style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
          {current}/{max}
        </span>
      )}
    </div>
  );
}
