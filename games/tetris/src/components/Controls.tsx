const KEYS: Array<[string, string]> = [
  ['← →', '左右移动'],
  ['↓', '软降'],
  ['↑ / X', '顺时针旋转'],
  ['Z / Ctrl', '逆时针旋转'],
  ['Space', '硬降'],
  ['Shift / C', 'Hold 暂存'],
  ['Esc / P', '暂停'],
  ['R', '重开'],
];

export default function Controls() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-400 sm:grid-cols-4">
      {KEYS.map(([k, desc]) => (
        <div key={k} className="flex items-center gap-2">
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
            {k}
          </kbd>
          <span>{desc}</span>
        </div>
      ))}
    </div>
  );
}
