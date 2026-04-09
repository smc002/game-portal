import { useCallback, useState } from 'react';
import type { GeneralInstance } from '../data/types';
import { TIER_COLORS, MAX_TEAM_SIZE, XP_TO_LV2, XP_TO_LV3 } from '../data/types';
import { generals } from '../data/generals';
import { Tooltip } from './Tooltip';
import { items } from '../data/items';

interface Props {
  team: GeneralInstance[];
  onReorder: (from: number, to: number) => void;
  onSell: (idx: number) => void;
  onMerge: (from: number, to: number) => void;
  onSlotClick?: (idx: number) => void;
  highlightSlots?: boolean;
  pendingItemName?: string;
}

function getXpProgress(general: GeneralInstance): { current: number; needed: number } | null {
  if (general.level === 3) return null;
  if (general.level === 1) {
    return { current: general.xp, needed: XP_TO_LV2 };
  }
  return { current: general.xp - XP_TO_LV2, needed: XP_TO_LV3 - XP_TO_LV2 };
}

function getPerkName(perkId: string): string {
  return items.find((i) => i.id === perkId)?.name ?? perkId;
}

export function TeamSlots({ team, onReorder, onSell, onMerge, onSlotClick, highlightSlots, pendingItemName }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    // Store index for sell zone drop
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOver(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    const source = team[dragIdx];
    const target = team[idx];
    if (source && target && source.defId === target.defId) {
      onMerge(dragIdx, idx);
    } else {
      onReorder(dragIdx, idx);
    }
    setDragIdx(null);
    setDragOver(null);
  }, [dragIdx, team, onReorder, onMerge]);

  const slots = [];
  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    const general = team[i];
    const def = general ? generals.find((g) => g.id === general.defId) : null;
    const tierColor = def ? TIER_COLORS[def.tier] ?? '#888' : 'var(--slot-border)';
    const isHighlighted = highlightSlots && general;

    const card = (
      <div
        key={i}
        draggable={!!general}
        onDragStart={(e) => general && handleDragStart(e, i)}
        onDragOver={(e) => handleDragOver(e, i)}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => handleDrop(i)}
        onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
        onClick={(e) => {
          e.stopPropagation();
          if (onSlotClick && general) {
            onSlotClick(i);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (general) onSell(i);
        }}
        style={{
          width: 'var(--card-width)',
          height: 'var(--card-height)',
          background: general ? 'var(--bg-card)' : 'transparent',
          border: `2px ${general ? 'solid' : 'dashed'} ${
            isHighlighted ? '#00e5ff' :
            dragOver === i ? 'var(--slot-valid)' : tierColor
          }`,
          borderRadius: 'var(--border-radius)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 4,
          cursor: onSlotClick && general ? 'pointer' : general ? 'grab' : 'default',
          opacity: dragIdx === i ? 0.4 : 1,
          transition: 'border-color 0.15s, opacity 0.15s, box-shadow 0.15s',
          position: 'relative',
          boxShadow: isHighlighted ? '0 0 8px rgba(0,229,255,0.4)' : undefined,
        }}
      >
        {general && def ? (
          <>
            {/* Level stars */}
            <div style={{ fontSize: 10, color: 'var(--text-gold)', alignSelf: 'flex-start' }}>
              {'★'.repeat(general.level)}
            </div>

            {/* Color block */}
            <div style={{
              width: 36,
              height: 36,
              background: tierColor,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: '#fff',
              fontWeight: 'bold',
            }}>
              {def.name[0]}
            </div>

            {/* Name */}
            <div style={{ fontSize: 10, textAlign: 'center' }}>
              {def.name}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
              <span className="atk">{general.atk + general.tempAtk}</span>
              <span className="hp">{general.hp + general.tempHp}</span>
            </div>

            {/* XP Progress Bar */}
            {(() => {
              const progress = getXpProgress(general);
              if (!progress) return null;
              const pct = Math.min(1, progress.current / progress.needed) * 100;
              return (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: '#333',
                  borderRadius: '0 0 2px 2px',
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: '#00e5ff',
                    borderRadius: '0 0 2px 2px',
                    transition: 'width 0.2s',
                  }} />
                </div>
              );
            })()}

            {/* Perk indicator */}
            {general.perk && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: 2,
                fontSize: 8,
                background: '#8b4513',
                color: '#fff',
                padding: '0 3px',
                borderRadius: 2,
              }}>
                {getPerkName(general.perk).slice(0, 2)}
              </div>
            )}
          </>
        ) : (
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: 11,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}>
            空位
          </div>
        )}
      </div>
    );

    if (general && def) {
      const progress = getXpProgress(general);
      const xpText = progress ? `经验: ${progress.current}/${progress.needed}` : '满级';
      const tooltipContent = (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{def.name} Lv.{general.level}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginBottom: 4 }}>
            T{def.tier} | {general.atk}/{general.hp} | {xpText}
          </div>
          <div style={{ color: '#ccc', marginBottom: 4 }}>{def.abilityDesc}</div>
          {general.perk && (
            <div style={{ color: '#d4a574', fontSize: 10 }}>
              锦囊: {getPerkName(general.perk)}
            </div>
          )}
          <div style={{ color: 'var(--text-secondary)', fontSize: 9, marginTop: 4 }}>
            右键或拖到上方出售 ({general.level} 金)
          </div>
        </div>
      );
      slots.push(
        <Tooltip key={i} content={tooltipContent}>
          {card}
        </Tooltip>
      );
    } else {
      slots.push(card);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 'var(--slot-gap)',
      flexDirection: 'row-reverse',
    }}>
      {slots}
    </div>
  );
}
