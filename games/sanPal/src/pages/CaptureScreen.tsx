import { useGameStore } from '../store/gameStore';
import { useBattleStore } from '../store/battleStore';
import { getGeneralDef } from '../data/generals';
import { ITEMS } from '../data/items';
import { WEAPON_EMOJI, WEAPON_LABEL } from '../data/types';
import { calcCaptureRate, attemptCapture } from '../engine/CaptureCalc';
import { createInstance } from '../engine/helpers';
import { useState } from 'react';

export default function CaptureScreen() {
  const gameStore = useGameStore();
  const enemyTeam = useBattleStore((s) => s.enemyTeam);
  const [result, setResult] = useState<'pending' | 'success' | 'fail'>('pending');

  const enemyGen = enemyTeam[0];
  if (!enemyGen) {
    gameStore.setPhase('map');
    return null;
  }

  const def = getGeneralDef(enemyGen!.defId);
  const captureItems = gameStore.inventory.items.filter((i) => {
    const item = ITEMS[i.itemId];
    return item?.category === 'capture' && i.count > 0;
  });

  function tryCapture(itemId: string) {
    const item = ITEMS[itemId]!;
    const rate = (item.effect as { captureRate: number }).captureRate;
    gameStore.removeItem(itemId);

    if (attemptCapture(rate, def.star)) {
      setResult('success');
      // Add to party or prompt replacement
      if (gameStore.party.length < 4) {
        const inst = createInstance(def.id, enemyGen!.level);
        gameStore.setParty([...gameStore.party, inst]);
      }
      // If party is full, we still mark success but player can manage team later
    } else {
      setResult('fail');
    }
  }

  function done() {
    gameStore.setPhase('map');
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: 24, gap: 20,
    }}>
      <div style={{ fontSize: 48 }}>{WEAPON_EMOJI[def.weapon]}</div>
      <div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-text-bright)' }}>
          {def.name}
        </span>
        <div style={{ fontSize: 13, color: 'var(--color-text-dim)', textAlign: 'center', marginTop: 4 }}>
          {'★'.repeat(def.star)} · {WEAPON_LABEL[def.weapon]}
        </div>
      </div>

      {result === 'pending' && (
        <>
          <div style={{ fontSize: 14, color: 'var(--color-text-dim)' }}>选择捕获道具：</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {captureItems.map((inv) => {
              const item = ITEMS[inv.itemId]!;
              const rate = calcCaptureRate((item.effect as { captureRate: number }).captureRate, def.star);
              return (
                <button key={inv.itemId} onClick={() => tryCapture(inv.itemId)} style={{ textAlign: 'left' }}>
                  <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                  <span style={{ color: 'var(--color-text-dim)', marginLeft: 8 }}>×{inv.count}</span>
                  <span style={{ float: 'right', color: 'var(--color-gold)' }}>{Math.floor(rate)}%</span>
                </button>
              );
            })}
          </div>
          <button onClick={done} style={{ width: '100%', marginTop: 8 }}>
            放弃捕获
          </button>
        </>
      )}

      {result === 'success' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, color: 'var(--color-gold)', fontFamily: 'var(--font-display)', marginBottom: 12 }}>
            捕获成功！
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-dim)', marginBottom: 16 }}>
            {def.name}加入了队伍！
          </div>
          <button className="primary" onClick={done} style={{ width: '100%' }}>继续</button>
        </div>
      )}

      {result === 'fail' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, color: 'var(--color-hp-low)', fontFamily: 'var(--font-display)', marginBottom: 12 }}>
            捕获失败...
          </div>
          {captureItems.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => setResult('pending')} style={{ flex: 1 }}>再试一次</button>
              <button onClick={done} style={{ flex: 1 }}>放弃</button>
            </div>
          ) : (
            <button className="primary" onClick={done} style={{ width: '100%' }}>继续</button>
          )}
        </div>
      )}
    </div>
  );
}
