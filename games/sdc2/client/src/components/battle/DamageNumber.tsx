import { useEffect, useState } from 'react';
import '../../styles/battle.css';

interface DamageEntry {
  id: number;
  amount: number;
  type: 'normal' | 'true' | 'heal' | 'shield';
  x: number;
  y: number;
}

let entryId = 0;

interface Props {
  entries: DamageEntry[];
}

export function createDamageEntry(
  amount: number,
  type: 'normal' | 'true' | 'heal' | 'shield',
  x: number,
  y: number
): DamageEntry {
  return { id: ++entryId, amount, type, x, y };
}

export default function DamageNumber({ entries }: Props) {
  return (
    <>
      {entries.map(entry => (
        <div
          key={entry.id}
          className={`damage-number damage-number--${entry.type}`}
          style={{
            left: `${entry.x}px`,
            top: `${entry.y}px`,
          }}
        >
          {entry.type === 'heal' ? '+' : entry.type === 'shield' ? '+' : '-'}
          {entry.amount}
        </div>
      ))}
    </>
  );
}
