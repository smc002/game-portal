import { useState, useEffect, useRef } from 'react';
import { OperationEffect } from '../../types/game';
import { GearInstance } from '../../types/gear';
import { GEAR_DEF_MAP } from '../../data/gears';
import { QUALITY_COLORS, Quality } from '../../types/enums';

interface OperationAnimProps {
  open: boolean;
  slots: (GearInstance | null)[];
  effects: OperationEffect[];
  onComplete: () => void;
}

interface FloatingItem {
  id: number;
  text: string;
  x: number;
  y: number;
}

const SLOT_DELAY = 800; // 每个槽位的动画间隔 ms

export function OperationAnim({ open, slots, effects, onComplete }: OperationAnimProps) {
  const [activeSlot, setActiveSlot] = useState(-1);
  const [floatings, setFloatings] = useState<FloatingItem[]>([]);
  const [highlightX, setHighlightX] = useState(0);
  const [done, setDone] = useState(false);
  const floatIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setActiveSlot(-1);
      setFloatings([]);
      setHighlightX(0);
      setDone(false);
      return;
    }

    // 逐个槽位播放动画
    const filledSlots = slots.map((s, i) => s ? i : -1).filter(i => i >= 0);
    if (filledSlots.length === 0) {
      onComplete();
      return;
    }

    let step = 0;
    const timer = setInterval(() => {
      if (step >= filledSlots.length) {
        clearInterval(timer);
        setTimeout(() => {
          setDone(true);
          onComplete();
        }, 600);
        return;
      }

      const slotIdx = filledSlots[step];
      setActiveSlot(slotIdx);
      setHighlightX(slotIdx);

      // 找到对应的 effect
      const eff = effects.find(e => {
        const snapIdx = effects.indexOf(e);
        return snapIdx === step;
      });
      if (eff) {
        eff.floatingTexts.forEach((text, fi) => {
          setTimeout(() => {
            const id = ++floatIdRef.current;
            setFloatings(prev => [...prev, {
              id,
              text,
              x: slotIdx * 110 + 50,
              y: 50 - fi * 28,
            }]);
            // 飘字 1.5s 后移除
            setTimeout(() => {
              setFloatings(prev => prev.filter(f => f.id !== id));
            }, 1500);
          }, fi * 300);
        });
      }

      step++;
    }, SLOT_DELAY);

    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="operation-anim-overlay">
      <div className="operation-anim-container">
        <div className="operation-anim-title">运 转 中</div>
        <div className="operation-anim-slots">
          {slots.map((gear, i) => {
            const isActive = activeSlot === i;
            const isPast = activeSlot > i;
            const def = gear ? GEAR_DEF_MAP.get(gear.defId) : null;

            return (
              <div
                key={i}
                className={`operation-anim-slot ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
              >
                {/* 高光扫描线 */}
                {isActive && <div className="slot-highlight" />}

                {gear && def ? (
                  <div
                    className={`operation-anim-gear ${isActive ? 'bounce' : ''}`}
                    style={{ borderColor: QUALITY_COLORS[gear.quality] }}
                  >
                    <span className="anim-gear-emoji">
                      {def.category === 'zhenbao' ? '★' : '◆'}
                    </span>
                    <span className="anim-gear-name">{def.name}</span>
                  </div>
                ) : (
                  <div className="operation-anim-empty" />
                )}
              </div>
            );
          })}

          {/* 飘字层 */}
          {floatings.map(f => (
            <div
              key={f.id}
              className="anim-floating-text"
              style={{ left: f.x, top: f.y }}
            >
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
