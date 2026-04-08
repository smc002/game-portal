import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types/index.js';
import { Faction, HeroClass } from '../../../shared/types/hero.js';
import { useGameStore } from '../stores/gameStore.js';
import { MAP_CITIES, CITY_MAP } from '../../../shared/data/maps.js';
import { ItemType } from '../../../shared/types/items.js';
import { MAX_INVENTORY_SIZE } from '../../../shared/data/items.js';
import Formation from '../components/squad/Formation.js';

const RARITY_BAR_COLORS: Record<string, string> = {
  gray: '#8a7560',
  green: '#4a9e5a',
  blue: '#5b8abf',
  orange: '#d4a017',
};

const ITEM_RARITY_COLORS: Record<string, string> = {
  gray: '#8a7560',
  green: '#4a9e5a',
  blue: '#5b8abf',
  orange: '#d4a017',
};

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: GameSocket | null;
}

const FACTION_BTN_COLORS: Record<string, string> = {
  wei: '#5b8abf', shu: '#4a9e5a', wu: '#c45050', qun: '#8e6ab8',
};
const FACTION_BTN_LABELS: Record<string, string> = {
  wei: '魏', shu: '蜀', wu: '吴', qun: '群',
};
const CLASS_BTN_LABELS: Record<string, string> = {
  mengjiang: '猛将', moushi: '谋士', houqin: '后勤',
};

const ITEM_BTN_COLORS: Record<string, string> = {
  potion: '#1a2e1a', bluff: '#2e2a1a', scout: '#1a1a2e', speed_boost: '#0a2e2e',
};
const ITEM_BTN_BORDERS: Record<string, string> = {
  potion: '#4a9e5a', bluff: '#d4a017', scout: '#5b8abf', speed_boost: '#3a9e8e',
};

/** 状态中文映射 */
const STATUS_LABELS: Record<string, string> = {
  exploring: '驻扎中',
  searching: '搜索中...',
  ambushing: '伏击中',
  moving: '行军中',
  in_battle: '交战中',
};

export default function InGame({ socket }: Props) {
  const player = useGameStore((s) => s.player);
  const mapState = useGameStore((s) => s.mapState);
  const searchProgress = useGameStore((s) => s.searchProgress);
  const [showInventory, setShowInventory] = useState(false);
  const [showTomesTip, setShowTomesTip] = useState(false);

  if (!player) return null;

  const currentCity = CITY_MAP.get(player.currentCityId);
  const isIdle = player.status === 'exploring';
  const isMoving = player.status === 'moving';
  const isSearching = player.status === 'searching';
  const isAmbushing = player.status === 'ambushing';

  const starCount = player.inventory.filter(i => i.type === ItemType.Star).length;
  const totalResourceValue = player.inventory
    .filter(i => i.type === ItemType.Resource)
    .reduce((sum, i) => sum + i.goldValue, 0);
  const usableItems = player.inventory.filter(
    i => i.type === ItemType.Potion || i.type === ItemType.Bluff ||
      i.type === ItemType.Scout || i.type === ItemType.SpeedBoost
  );
  const hasBlackMarket = currentCity?.hasBlackMarket ?? false;
  const activeBuffs = player.activeBuffs ?? [];
  const hasBluffBuff = activeBuffs.some(b => b.type === 'bluff');
  const hasSpeedBuff = activeBuffs.some(b => b.type === 'speed_boost');
  const npcs = mapState?.npcs ?? [];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ══ 左侧主区域 ══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* ── 顶部状态栏 ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 16px',
          background: 'linear-gradient(180deg, #211a14 0%, #1c1410 100%)',
          borderBottom: '2px solid #5c3a21',
          position: 'relative',
        }}>
          {/* 底部装饰线 */}
          <div style={{
            position: 'absolute', bottom: '-1px', left: '10%', right: '10%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(212, 160, 23, 0.3), transparent)',
          }} />

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span style={{
              fontWeight: 'bold',
              fontFamily: 'var(--font-heading)',
              color: '#f0c850',
              fontSize: '20px',
            }}>
              {player.username}
            </span>
            {/* HP条 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '120px', height: '14px',
                background: '#1a0f0a',
                borderRadius: '2px',
                overflow: 'hidden', position: 'relative',
                border: '1px solid #5c3a21',
              }}>
                <div style={{
                  width: `${(player.hp / player.maxHp) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b1528, #c41e3a)',
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: '16px', color: '#c41e3a', fontFamily: 'var(--font-body)' }}>
                {player.hp}/{player.maxHp}
              </span>
            </div>
            {player.shield > 0 && (
              <span style={{ fontSize: '16px', color: '#4a7fb5' }}>
                护盾 {player.shield}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span style={{ color: '#d4a017', fontSize: '18px', fontFamily: 'var(--font-heading)' }}>
              {player.gold} 金
            </span>
            {totalResourceValue > 0 && (
              <span style={{ fontSize: '16px', color: 'var(--color-text-dim)' }}>
                物资 {totalResourceValue}金
              </span>
            )}
            {/* 背包按钮（可点击） */}
            <button
              onClick={() => setShowInventory(!showInventory)}
              style={{
                padding: '2px 10px', fontSize: '16px',
                background: showInventory
                  ? 'linear-gradient(180deg, #2a3a1a, #1a2a0e)'
                  : 'linear-gradient(180deg, #3a2a1a, #2a1a0e)',
                color: showInventory ? '#4a9e5a' : 'var(--color-text-dim)',
                border: `1px solid ${showInventory ? '#4a9e5a' : '#5c3a21'}`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              背包 {player.inventory.length}/{MAX_INVENTORY_SIZE}
            </button>
            {/* 兵法按钮（可点击） */}
            {player.activeTomes.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTomesTip(!showTomesTip)}
                  style={{
                    padding: '2px 10px', fontSize: '14px',
                    background: showTomesTip
                      ? 'linear-gradient(180deg, #2a1a3a, #1a0e2a)'
                      : 'linear-gradient(180deg, #3a2a1a, #2a1a0e)',
                    color: showTomesTip ? '#8e6ab8' : 'var(--color-text-dim)',
                    border: `1px solid ${showTomesTip ? '#8e6ab8' : '#5c3a21'}`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  兵法 ({player.activeTomes.length})
                </button>
                {/* 兵法描述tips */}
                {showTomesTip && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 100,
                    marginTop: '4px', padding: '10px 14px',
                    background: 'var(--color-bg-panel)',
                    border: '1px solid #5c3a21',
                    minWidth: '200px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  }}>
                    {player.activeTomes.map(t => (
                      <div key={t.id} style={{ marginBottom: '6px' }}>
                        <div style={{
                          fontSize: '14px', color: '#f0c850',
                          fontFamily: 'var(--font-heading)',
                          letterSpacing: '1px',
                        }}>
                          {t.name}
                        </div>
                        <div style={{
                          fontSize: '12px', color: 'var(--color-text-dim)',
                          marginTop: '2px',
                        }}>
                          {t.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {hasBluffBuff && (
              <span style={{
                fontSize: '13px', color: '#d4a017',
                background: '#2e2a1a', padding: '1px 6px',
                border: '1px solid #5c3a21',
              }}>
                虚张声势
              </span>
            )}
            {hasSpeedBuff && (
              <span style={{
                fontSize: '13px', color: '#4a9e5a',
                background: '#1a2e1a', padding: '1px 6px',
                border: '1px solid #3a5c2a',
              }}>
                急行军
              </span>
            )}
          </div>
        </div>

        {/* ── 移动进度条 ── */}
        {isMoving && player.moveProgress > 0 && (
          <div style={{ height: '3px', background: '#1a0f0a' }}>
            <div style={{
              height: '100%',
              width: `${player.moveProgress * 100}%`,
              background: 'linear-gradient(90deg, #8b6914, #d4a017)',
              transition: 'width 0.2s linear',
            }} />
          </div>
        )}

        {/* ── 地图区域 ── */}
        <div style={{
          flex: 1, position: 'relative', padding: '20px',
          minHeight: 0, overflow: 'hidden',
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(139, 105, 20, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(196, 30, 58, 0.03) 0%, transparent 50%)
          `,
        }}>
          {/* 背包面板（覆盖在地图上方） */}
          {showInventory && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px', zIndex: 50,
              width: '320px', maxHeight: 'calc(100% - 20px)',
              background: 'var(--color-bg-panel)',
              border: '1px solid #5c3a21',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #3a2a1a',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontSize: '16px', color: '#f0c850',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '2px',
                }}>
                  背包 ({player.inventory.length}/{MAX_INVENTORY_SIZE})
                </span>
                <button
                  onClick={() => setShowInventory(false)}
                  style={{
                    padding: '2px 8px', fontSize: '12px',
                    background: '#2a2020', color: '#8a7560',
                    border: '1px solid #3a2a1a',
                  }}
                >
                  关闭
                </button>
              </div>
              {player.inventory.length === 0 ? (
                <div style={{
                  padding: '20px', textAlign: 'center',
                  color: 'var(--color-text-dim)', fontSize: '14px',
                }}>
                  空空如也
                </div>
              ) : (
                <div style={{ padding: '6px' }}>
                  {player.inventory.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', marginBottom: '2px',
                      background: 'rgba(10, 6, 4, 0.4)',
                      border: '1px solid #2a1a0e',
                    }}>
                      <div>
                        <span style={{
                          fontSize: '14px',
                          color: ITEM_RARITY_COLORS[item.rarity] || '#e8d5b7',
                          fontFamily: 'var(--font-heading)',
                        }}>
                          {item.name}
                        </span>
                        <span style={{
                          fontSize: '11px', color: 'var(--color-text-dim)',
                          marginLeft: '6px',
                        }}>
                          {item.description}
                        </span>
                      </div>
                      {item.type === ItemType.Resource && (
                        <span style={{ fontSize: '13px', color: '#d4a017' }}>
                          {item.goldValue}金
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 内层容器：固定宽高比，SVG和城市节点共用同一参考系 */}
          <div style={{
            position: 'relative',
            aspectRatio: '900 / 720',
            maxWidth: '100%',
            maxHeight: '100%',
            margin: 'auto',
          }}>
          <svg width="100%" height="100%" viewBox="0 0 900 720"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            {/* 城池连线 */}
            {MAP_CITIES.map(city =>
              city.connections.map(connId => {
                const target = CITY_MAP.get(connId);
                if (!target || city.id > connId) return null;
                const isOnPath =
                  (city.id === player.currentCityId && connId === player.moveTarget) ||
                  (connId === player.currentCityId && city.id === player.moveTarget);
                return (
                  <line
                    key={`${city.id}-${connId}`}
                    x1={city.position.x} y1={city.position.y}
                    x2={target.position.x} y2={target.position.y}
                    stroke={isOnPath ? '#d4a017' : '#3a2a1a'}
                    strokeWidth={isOnPath ? 3 : 1.5}
                    strokeDasharray={isOnPath ? '8 4' : undefined}
                    opacity={isOnPath ? 0.9 : 0.5}
                  />
                );
              })
            )}
            {/* NPC移动目标箭头 */}
            <defs>
              <marker id="npc-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#c41e3a" />
              </marker>
            </defs>
            {npcs.map(npc => {
              const fromCity = CITY_MAP.get(npc.currentCityId);
              const toCity = CITY_MAP.get(npc.targetCityId);
              if (!fromCity || !toCity) return null;
              return (
                <line
                  key={`npc-path-${npc.id}`}
                  x1={fromCity.position.x} y1={fromCity.position.y}
                  x2={toCity.position.x} y2={toCity.position.y}
                  stroke="#c41e3a"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  opacity={0.7}
                  markerEnd="url(#npc-arrow)"
                />
              );
            })}
          </svg>

          {MAP_CITIES.map(city => {
            const isHere = city.id === player.currentCityId;
            const isMoveTarget = city.id === player.moveTarget;
            const cityState = mapState?.cities[city.id];
            const depleted = cityState?.depleted ?? false;
            const playerCount = cityState?.presentPlayerIds.length ?? 0;
            const canMove = isIdle && !isHere && currentCity?.connections.includes(city.id);

            return (
              <div
                key={city.id}
                onClick={() => {
                  if (canMove && socket) {
                    socket.emit('game:move', { targetCityId: city.id });
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${(city.position.x / 900) * 100}%`,
                  top: `${(city.position.y / 720) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  padding: '8px 14px',
                  background: isHere
                    ? 'linear-gradient(180deg, rgba(196, 30, 58, 0.2), rgba(139, 105, 20, 0.15))'
                    : isMoveTarget
                      ? 'linear-gradient(180deg, rgba(139, 105, 20, 0.15), rgba(92, 58, 33, 0.1))'
                      : 'var(--color-bg-panel)',
                  border: `1px solid ${isHere ? '#c41e3a' : isMoveTarget ? '#8b6914' : depleted ? '#3a2a1a' : '#5c3a21'}`,
                  cursor: canMove ? 'pointer' : 'default',
                  textAlign: 'center',
                  minWidth: '90px',
                  transition: 'all 0.3s',
                  opacity: depleted && !isHere ? 0.55 : 1,
                  boxShadow: isHere ? '0 0 12px rgba(196, 30, 58, 0.2)' : 'none',
                }}
              >
                {/* 搜索进度条 - 仅在当前城市搜索时显示，纯CSS动画驱动 */}
                {isHere && isSearching && searchProgress && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '5%', right: '5%',
                    height: '6px', background: '#1a0f0a',
                    border: '1px solid #3a2a1a', borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div
                      key={searchProgress.startTime}
                      style={{
                        height: '100%',
                        width: '100%',
                        background: RARITY_BAR_COLORS[searchProgress.rarity] || '#8a7560',
                        boxShadow: `0 0 4px ${RARITY_BAR_COLORS[searchProgress.rarity] || '#8a7560'}`,
                        transformOrigin: 'left',
                        animation: `searchFill ${searchProgress.duration}s linear forwards`,
                      }}
                    />
                  </div>
                )}
                <div style={{
                  fontWeight: 'bold', fontSize: '18px',
                  fontFamily: 'var(--font-heading)',
                  color: isHere ? '#f0c850' : 'var(--color-text)',
                  letterSpacing: '1px',
                }}>
                  {city.name}
                </div>
                <div style={{ fontSize: '13px', color: '#c41e3a', marginTop: '2px', letterSpacing: '1px' }}>
                  {'★'.repeat(city.dangerLevel)}{'☆'.repeat(5 - city.dangerLevel)}
                </div>
                {/* 标签行 */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                  {city.isEvacPoint && (
                    <span style={{
                      fontSize: '13px', color: '#d4a017',
                      background: '#2e2a1a', padding: '0 5px',
                      border: '1px solid #5c3a21',
                      fontFamily: 'var(--font-heading)',
                    }}>
                      撤离
                    </span>
                  )}
                  {city.hasBlackMarket && (
                    <span style={{
                      fontSize: '13px', color: '#8e6ab8',
                      background: '#1a0a2e', padding: '0 5px',
                      border: '1px solid #3a2050',
                    }}>
                      黑市
                    </span>
                  )}
                  {depleted && (
                    <span style={{
                      fontSize: '13px', color: '#8a7560',
                      background: '#1a1410', padding: '0 5px',
                      border: '1px solid #3a2a1a',
                    }}>
                      枯竭
                    </span>
                  )}
                </div>
                {!depleted && cityState && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                    资源 {cityState.remainingResources}/{city.maxResources}
                  </div>
                )}
                {playerCount > 0 && (
                  <div style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    background: '#c41e3a', color: '#f0c850',
                    fontSize: '13px', fontWeight: 'bold',
                    width: '20px', height: '20px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #8b6914',
                  }}>
                    {playerCount}
                  </div>
                )}
                {npcs.filter(n => n.currentCityId === city.id).map(npc => (
                  <div key={npc.id} style={{
                    position: 'absolute', top: '-8px', left: '-8px',
                    background: '#8b1528', color: '#f0c850',
                    fontSize: '10px', fontWeight: 'bold',
                    padding: '1px 5px',
                    border: '1px solid #c41e3a',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-heading)',
                  }}>
                    {npc.name}
                  </div>
                ))}
              </div>
            );
          })}
          </div>{/* 内层容器结束 */}
        </div>

      </div>

      {/* ══ 右侧编队面板（常驻） ══ */}
      <div style={{
        width: '280px', flexShrink: 0,
        borderLeft: '2px solid #5c3a21',
        background: 'var(--color-bg-panel)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid #3a2a1a',
          background: 'linear-gradient(180deg, #211a14 0%, #1c1410 100%)',
        }}>
          <span style={{
            fontSize: '16px', color: '#f0c850',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '2px',
          }}>
            编队 ({player.formation.filter(Boolean).length}/5)
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Formation
            formation={player.formation}
            bench={player.bench}
            socket={socket}
            disabled={player.status === 'in_battle'}
          />
        </div>
      </div>

      {/* ══ 浮动底部控制栏 ══ */}
      <div style={{
        position: 'fixed',
        bottom: '8px',
        left: '8px',
        right: '288px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.6)',
        border: '1px solid #5c3a21',
      }}>
        {/* 将星快捷区 */}
        {starCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px',
            background: 'var(--color-bg-light)',
            borderBottom: '1px solid #3a2a1a',
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: '16px', color: '#d4a017',
              fontFamily: 'var(--font-heading)',
            }}>
              将星 x{starCount}
            </span>
            {Object.values(Faction).map(f => (
              <button key={f}
                onClick={() => {
                  socket?.emit('squad:use_star', { filter: { type: 'faction', value: f } });
                }}
                style={{
                  padding: '2px 8px', fontSize: '14px',
                  background: '#1a1410', color: FACTION_BTN_COLORS[f],
                  border: `1px solid ${FACTION_BTN_COLORS[f]}44`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {FACTION_BTN_LABELS[f]}
              </button>
            ))}
            <span style={{ color: '#3a2a1a', fontSize: '18px' }}>|</span>
            {Object.values(HeroClass).map(c => (
              <button key={c}
                onClick={() => {
                  socket?.emit('squad:use_star', { filter: { type: 'class', value: c } });
                }}
                style={{
                  padding: '2px 8px', fontSize: '14px',
                  background: '#1a1410', color: '#8a7560',
                  border: '1px solid #3a2a1a',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {CLASS_BTN_LABELS[c]}
              </button>
            ))}
          </div>
        )}

        {/* 主控制区 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', padding: '10px 16px',
          background: 'linear-gradient(180deg, #211a14ee 0%, #1c1410ee 100%)',
          flexWrap: 'wrap',
          position: 'relative',
        }}>
          {/* 当前位置与状态 */}
          <div style={{
            marginRight: '8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
          }}>
            <span style={{
              fontSize: '20px',
              fontFamily: 'var(--font-heading)',
              color: '#f0c850',
              letterSpacing: '2px',
            }}>
              {currentCity?.name ?? '未知'}
            </span>
            <span style={{
              fontSize: '14px',
              fontFamily: 'var(--font-heading)',
              color: isSearching ? '#4a9e5a' : isAmbushing ? '#d4a017' : isMoving ? '#c41e3a' : 'var(--color-text-dim)',
              letterSpacing: '1px',
            }}>
              {STATUS_LABELS[player.status] ?? player.status}
            </span>
          </div>

          {/* 搜索按钮 */}
          {isSearching ? (
            <button
              onClick={() => {
                useGameStore.getState().patchPlayer({ status: 'exploring' });
                useGameStore.getState().setSearchProgress(null);
                socket?.emit('game:search_stop');
              }}
              style={{
                background: 'linear-gradient(180deg, #2a5c2a, #1a3e1a)',
                color: '#4a9e5a',
                border: '1px solid #4a9e5a',
                animation: 'pulse 1.5s ease-in-out infinite',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '2px',
                fontSize: '18px',
              }}
            >
              停止搜索
            </button>
          ) : (
            <button
              onClick={() => socket?.emit('game:search_start')}
              disabled={!isIdle}
              style={{
                background: 'linear-gradient(180deg, #3a2a1a, #2a1a0e)',
                color: 'var(--color-text)',
                border: '1px solid #5c3a21',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '2px',
                fontSize: '18px',
              }}
            >
              搜索
            </button>
          )}

          {/* 蹲守按钮 */}
          <button
            onClick={() => socket?.emit('game:ambush')}
            disabled={!isIdle && !isAmbushing}
            style={{
              background: isAmbushing
                ? 'linear-gradient(180deg, #5c4a1a, #3e3010)'
                : 'linear-gradient(180deg, #3a2a1a, #2a1a0e)',
              color: isAmbushing ? '#d4a017' : 'var(--color-text)',
              border: `1px solid ${isAmbushing ? '#8b6914' : '#5c3a21'}`,
              fontFamily: 'var(--font-heading)',
              letterSpacing: '2px',
              fontSize: '18px',
            }}
          >
            {isAmbushing ? '解除伏击' : '伏击'}
          </button>

          {/* 撤离按钮 */}
          <button
            onClick={() => socket?.emit('game:evacuate')}
            disabled={!isIdle || !currentCity?.isEvacPoint}
            style={{
              background: (isIdle && currentCity?.isEvacPoint)
                ? 'linear-gradient(180deg, #8b6914, #d4a017, #8b6914)'
                : 'linear-gradient(180deg, #2a2a2a, #1a1a1a)',
              color: (isIdle && currentCity?.isEvacPoint) ? '#1a0f0a' : '#555',
              fontWeight: 'bold',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '2px',
              fontSize: '18px',
              border: `1px solid ${(isIdle && currentCity?.isEvacPoint) ? '#d4a017' : '#3a2a1a'}`,
            }}
          >
            撤离
          </button>

          {/* 黑市按钮 */}
          {hasBlackMarket && isIdle && (
            <button
              onClick={() => socket?.emit('game:buy_star')}
              style={{
                background: 'linear-gradient(180deg, #2a1040, #1a0830)',
                color: '#8e6ab8',
                border: '1px solid #5a3a80',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '1px',
                fontSize: '18px',
              }}
            >
              黑市买将星
            </button>
          )}

          {/* 放弃 */}
          <button
            onClick={() => {
              if (confirm('确定弃甲归田？所有物资将尽失！')) {
                socket?.emit('game:quit');
              }
            }}
            style={{
              background: 'linear-gradient(180deg, #2a2020, #1a1010)',
              color: '#6a5a4a',
              fontSize: '16px',
              border: '1px solid #3a2a1a',
              fontFamily: 'var(--font-heading)',
            }}
          >
            弃权
          </button>
        </div>

        {/* 道具快捷栏 */}
        {usableItems.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', borderTop: '1px solid #3a2a1a',
            background: 'var(--color-bg-light)', flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: '14px', color: 'var(--color-text-dim)', marginRight: '4px',
              fontFamily: 'var(--font-heading)',
            }}>
              随身:
            </span>
            {usableItems.map(item => (
              <button
                key={item.id}
                onClick={() => socket?.emit('game:use_item', { itemId: item.id })}
                disabled={player.status === 'in_battle'}
                style={{
                  padding: '2px 8px', fontSize: '14px',
                  background: ITEM_BTN_COLORS[item.type] ?? '#1a1410',
                  color: 'var(--color-text)',
                  border: `1px solid ${ITEM_BTN_BORDERS[item.type] ?? '#3a2a1a'}`,
                  cursor: 'pointer',
                  opacity: player.status === 'in_battle' ? 0.4 : 1,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
