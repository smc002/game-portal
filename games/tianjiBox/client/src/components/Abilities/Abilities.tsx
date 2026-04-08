import { useGame } from '../../context/GameContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { AbilityType } from '../../types/enums';

interface AbilitiesProps {
  open: boolean;
  onClose: () => void;
}

export function Abilities({ open, onClose }: AbilitiesProps) {
  const { state } = useGame();
  const { showToast } = useToast();

  if (state.todayAbilities.length === 0) return null;

  return (
    <Modal open={open} onClose={onClose} title="今日能力">
      <div className="ability-list">
        {state.todayAbilities.map((ab, i) => (
          <div key={i} className="ability-item">
            <div>
              <div className="ability-name">{ab.name}</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
                {ab.description}
              </div>
              {ab.type === AbilityType.Usable && ab.uses !== undefined && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  剩余次数：{ab.uses}
                </div>
              )}
            </div>
            <div>
              {ab.type === AbilityType.Passive && (
                <span style={{ fontSize: 12, color: 'var(--success)', padding: '2px 8px', background: 'rgba(68,204,102,0.15)', borderRadius: 4 }}>
                  持续生效
                </span>
              )}
              {ab.type === AbilityType.Usable && (
                <button
                  className="btn btn-small btn-cancel"
                  onClick={() => showToast('演示模式，效果仅供展示')}
                >
                  使用
                </button>
              )}
              {ab.type === AbilityType.Activatable && (
                <button
                  className="btn btn-small btn-confirm"
                  onClick={() => showToast(ab.description)}
                  disabled={ab.used}
                >
                  {ab.used ? '已使用' : '使用'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
