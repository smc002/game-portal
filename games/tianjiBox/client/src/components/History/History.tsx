import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Modal } from '../common/Modal';
import { GearIcon } from '../Gear/GearIcon';
import { OperationRecord } from '../../types/game';
import { GEAR_DEF_MAP } from '../../data/gears';
import { Rating } from '../../types/enums';

interface HistoryProps {
  open: boolean;
  onClose: () => void;
}

const RATING_COLORS: Record<string, string> = {
  [Rating.Normal]: 'var(--rating-normal)',
  [Rating.Strategic]: 'var(--rating-strategic)',
  [Rating.Masterful]: 'var(--rating-masterful)',
  [Rating.Divine]: 'var(--rating-divine)',
};

const PAGE_SIZE = 10;

export function History({ open, onClose }: HistoryProps) {
  const { state } = useGame();
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<OperationRecord | null>(null);

  const totalPages = Math.ceil(state.history.length / PAGE_SIZE);
  const pageItems = state.history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Modal open={open} onClose={onClose} title={`运转记录（${state.history.length}条）`}>
      {state.history.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>暂无记录</div>
      ) : (
        <>
          <div className="history-list">
            {pageItems.map((rec, i) => (
              <div key={i} className="history-item" onClick={() => setDetail(rec)}>
                <div className="history-item-header">
                  <span>第 {rec.day} 天</span>
                  <span style={{ color: RATING_COLORS[rec.rating] }}>{rec.rating}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {rec.slotSnapshots.map((snap, j) => (
                    <GearIcon key={j} defId={snap.defId} quality={snap.quality} size="small" />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  总分 {rec.totalScore} | 珍宝点数 +{rec.treasurePointsGained}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
              <button className="btn btn-small btn-cancel" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                ← 上一页
              </button>
              <span style={{ fontSize: 13, color: '#888' }}>{page + 1} / {totalPages}</span>
              <button className="btn btn-small btn-cancel" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
                下一页 →
              </button>
            </div>
          )}
        </>
      )}

      {/* 详情展开 */}
      {detail && (
        <Modal open={true} onClose={() => setDetail(null)} title={`第 ${detail.day} 天 运转详情`}>
          <div className="result-effects">
            {detail.effects.map((eff, i) => (
              <div key={i} className="result-effect-item">
                <GearIcon defId={eff.gearDefId} quality={eff.quality} size="small" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{eff.gearName}</div>
                  <div style={{ fontSize: 13, color: '#aaa' }}>{eff.normalEffectText}</div>
                  {eff.specialTriggered && (
                    <div style={{ fontSize: 13, color: '#ffd700' }}>{eff.specialEffectText}</div>
                  )}
                </div>
                <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>+{eff.score}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, color: RATING_COLORS[detail.rating], fontSize: 18, fontWeight: 'bold' }}>
            {detail.rating} · {detail.totalScore}分
          </div>
        </Modal>
      )}
    </Modal>
  );
}
