import { useState } from 'react';
import { OperationRecord } from '../../types/game';
import { Modal } from '../common/Modal';
import { GearIcon } from '../Gear/GearIcon';
import { Rating, Quality } from '../../types/enums';
import { GEAR_DEF_MAP } from '../../data/gears';

interface ResultPanelProps {
  open: boolean;
  record: OperationRecord | null;
  onClose: () => void;
  batchGears?: string[] | null;
}

const RATING_COLORS: Record<string, string> = {
  [Rating.Normal]: 'var(--rating-normal)',
  [Rating.Strategic]: 'var(--rating-strategic)',
  [Rating.Masterful]: 'var(--rating-masterful)',
  [Rating.Divine]: 'var(--rating-divine)',
};

export function ResultPanel({ open, record, onClose, batchGears }: ResultPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!record) return null;

  return (
    <Modal open={open} onClose={onClose} title="运转结果">
      <div className="result-score">
        <div className="score-value">{record.totalScore}</div>
        <div
          className={`rating-text ${record.rating === Rating.Divine ? 'rating-divine' : record.rating === Rating.Masterful ? 'rating-masterful' : ''}`}
          style={{ color: RATING_COLORS[record.rating] }}
        >
          {record.rating}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
          珍宝点数 +{record.treasurePointsGained}
        </div>
      </div>

      <div className="result-effects">
        {record.effects.map((eff, i) => {
          const def = GEAR_DEF_MAP.get(eff.gearDefId);
          return (
            <div
              key={i}
              className="result-effect-item"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              <GearIcon defId={eff.gearDefId} quality={eff.quality} size="small" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{def?.name ?? eff.gearDefId}</div>
                <div style={{ fontSize: 13, color: '#aaa' }}>{eff.normalEffectText}</div>
                {eff.specialTriggered && (
                  <div style={{ fontSize: 13, color: '#ffd700' }}>{eff.specialEffectText}</div>
                )}
                {expandedIdx === i && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    分数：{eff.score}
                    {eff.effectiveQuality !== eff.quality && ` (生效等级: ${eff.effectiveQuality})`}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)' }}>
                +{eff.score}
              </div>
            </div>
          );
        })}
      </div>

      {/* 百宝箱结果 */}
      {batchGears && batchGears.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,215,0,0.1)', borderRadius: 8 }}>
          <div style={{ fontWeight: 'bold', color: '#ffd700', marginBottom: 8 }}>百宝箱开启！获得机关：</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {batchGears.map((defId, i) => (
              <GearIcon key={i} defId={defId} quality={Quality.White} size="small" />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button className="btn btn-confirm" onClick={onClose}>确认</button>
      </div>
    </Modal>
  );
}
