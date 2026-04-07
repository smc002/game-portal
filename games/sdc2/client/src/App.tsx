import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { useGameStore } from './stores/gameStore.js';
import Login from './pages/Login.js';
import Lobby from './pages/Lobby.js';
import InGame from './pages/InGame.js';
import NotificationToast from './components/NotificationToast.js';
import CenterFloat from './components/CenterFloat.js';
import RerollModal from './components/modals/RerollModal.js';
import BattleScene from './components/battle/BattleScene.js';
import EncounterModal from './components/modals/EncounterModal.js';
import LootModal from './components/modals/LootModal.js';

export default function App() {
  const { socket, connected } = useSocket();
  const {
    phase, setPhase, setPlayer, patchPlayer, setMapState, patchMapState,
    addNotification, addCenterFloat, rerollData, setRerollData, setBattleData, battleEvents, battleResult, clearBattle,
    encounterData, setEncounterData, lootData, setLootData, setSearchProgress,
  } = useGameStore();

  // 注册服务端事件监听
  useEffect(() => {
    if (!socket) return;

    socket.on('lobby:login_ok', ({ playerId, state }) => {
      console.log('[App] 登录成功', playerId);
      setPlayer(state);
      setPhase('lobby');
    });

    socket.on('lobby:error', ({ message }) => {
      addNotification('error', message);
    });

    socket.on('state:sync', (state) => {
      setPlayer(state);
      if (state.inGame) {
        setPhase('in_game');
      } else {
        setPhase('lobby');
      }
    });

    socket.on('state:patch', (patch) => {
      patchPlayer(patch);
      // 状态离开searching时清除搜索进度
      if (patch.status && patch.status !== 'searching') {
        setSearchProgress(null);
      }
    });

    socket.on('map:init', (mapState) => {
      setMapState(mapState);
      setPhase('in_game');
    });

    socket.on('map:update', (patch) => {
      patchMapState(patch);
    });

    socket.on('game:search_tick_start', (data) => {
      setSearchProgress(data);
    });

    socket.on('game:search_found', ({ item }) => {
      // 如果玩家已停止搜索（乐观更新），忽略迟到的搜索结果
      if (useGameStore.getState().player?.status !== 'searching') return;
      setSearchProgress(null);
      const rarityColors: Record<string, string> = {
        gray: '#8a7560', green: '#4a9e5a', blue: '#5b8abf', orange: '#d4a017',
      };
      const color = rarityColors[item.rarity] || '#4a9e5a';
      const label = item.type === 'resource'
        ? `搜到 ${item.name}(${item.goldValue}金)`
        : `搜到 ${item.name}`;
      addCenterFloat(label, color);
    });

    socket.on('notification', ({ type, message, data }) => {
      // 标记为中央飘字的事件显示在屏幕中央
      if (data?.centerFloat) {
        const colorMap: Record<string, string> = {
          success: '#4a9e5a', error: '#c41e3a', warning: '#d4a017', info: '#5b8abf',
        };
        addCenterFloat(message, colorMap[type] || '#f0c850');
      } else {
        addNotification(type, message);
      }
    });

    socket.on('game:initial_heroes', ({ heroes, freeRerolls }) => {
      setRerollData({ heroes, freeRerolls });
    });

    // 战斗事件流：先缓存events，收到result后一起展示
    let pendingBattleEvents: import('../../../shared/types/battle.js').BattleEvent[] | null = null;
    socket.on('battle:events', ({ events }) => {
      pendingBattleEvents = events;
    });
    socket.on('battle:result', (result) => {
      if (pendingBattleEvents) {
        setBattleData(pendingBattleEvents, result);
        pendingBattleEvents = null;
      }
    });

    socket.on('encounter:alert', (data) => {
      setEncounterData(data);
    });

    socket.on('loot:options', (data) => {
      setLootData(data);
    });

    socket.on('map:npc_move', ({ npcId, from, to }) => {
      addNotification('warning', `巡逻NPC 正在移动...`);
    });

    socket.on('encounter:npc_alert', ({ npcName, npcPower }) => {
      addNotification('error', `遭遇巡逻NPC ${npcName}(战力:${npcPower})！`);
    });

    return () => {
      socket.off('lobby:login_ok');
      socket.off('lobby:error');
      socket.off('state:sync');
      socket.off('state:patch');
      socket.off('map:init');
      socket.off('map:update');
      socket.off('game:search_tick_start');
      socket.off('game:search_found');
      socket.off('notification');
      socket.off('game:initial_heroes');
      socket.off('battle:events');
      socket.off('battle:result');
      socket.off('encounter:alert');
      socket.off('loot:options');
      socket.off('map:npc_move');
      socket.off('encounter:npc_alert');
    };
  }, [socket, setPhase, setPlayer, patchPlayer, setMapState, patchMapState, addNotification, addCenterFloat, setRerollData, setBattleData, setEncounterData, setLootData, setSearchProgress]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {!connected && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: 'linear-gradient(90deg, #1a0f0a, #3a1a0a, #1a0f0a)',
          color: '#d4a017', textAlign: 'center',
          padding: '4px', fontSize: '12px', zIndex: 9999,
          borderBottom: '1px solid #5c3a21',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '2px',
        }}>
          正在连接中军大帐...
        </div>
      )}
      <NotificationToast />
      <CenterFloat />
      {phase === 'login' && <Login socket={socket} connected={connected} />}
      {phase === 'lobby' && <Lobby socket={socket} />}
      {phase === 'in_game' && <InGame socket={socket} />}
      {battleEvents && battleResult && (() => {
        const player = useGameStore.getState().player;
        // 判断我方是A还是B
        const mySide: 'A' | 'B' = player?.playerId === battleResult.formationA?.[0]?.instanceId ? 'A' : 'A';
        return (
          <BattleScene
            events={battleEvents}
            result={battleResult}
            mySide={mySide}
            formationA={battleResult.formationA ?? player?.formation ?? []}
            formationB={battleResult.formationB ?? []}
            maxHpA={battleResult.maxHpA ?? player?.maxHp ?? 500}
            maxHpB={battleResult.maxHpB ?? 500}
            nameA={battleResult.nameA ?? player?.username ?? '我方'}
            nameB={battleResult.nameB ?? '敌方'}
            onClose={clearBattle}
          />
        );
      })()}
      {encounterData && (
        <EncounterModal
          enemyName={encounterData.enemyName}
          estimatedPower={encounterData.estimatedPower}
          encounterType={encounterData.type}
          fleeCount={useGameStore.getState().player?.fleeCount ?? 0}
          socket={socket}
          onClose={() => setEncounterData(null)}
        />
      )}
      {lootData && (
        <LootModal
          heroOption={lootData.heroOption}
          resourceAmount={lootData.resourceAmount}
          socket={socket}
          onClose={() => setLootData(null)}
        />
      )}
      {rerollData && (
        <RerollModal
          heroes={rerollData.heroes}
          freeRerolls={rerollData.freeRerolls}
          socket={socket}
          gold={useGameStore.getState().player?.gold ?? 0}
          onConfirm={() => setRerollData(null)}
        />
      )}
    </div>
  );
}
