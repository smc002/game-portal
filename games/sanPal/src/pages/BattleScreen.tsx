import { useCallback, useEffect, useRef } from 'react';
import { useBattleStore } from '../store/battleStore';
import { useGameStore } from '../store/gameStore';
import { getGeneralDef } from '../data/generals';
import {
  WEAPON_EMOJI, WEAPON_LABEL, getAdvantageText,
  STATUS_EMOJI, MAX_ENERGY,
} from '../data/types';
import type { SkillDef } from '../data/types';
import {
  calcDamage, accuracyCheck, applySkillEffects, processTurnStart,
  applyDamage, resolveStance, getFirstActor, confusionSelfDamage,
  calcCounterDamage, getHitCount,
} from '../engine/BattleEngine';
import { decideAIAction } from '../engine/AIController';
import { isAlive, clampHP } from '../engine/helpers';
import { generateMap } from '../engine/MapGenerator';
import { onSwitchIn, onDamageTaken, onSkillUsed, processBossPassive, onEnemyFaint, getMultiHitAccuracyBonus } from '../engine/PassiveSystem';
import { applySynergyBonuses, checkTriggerSynergy, getSynergyCritBonus } from '../engine/SynergySystem';
import { ITEMS } from '../data/items';
import { useState } from 'react';

// Helper: always read fresh state from store
function getState() {
  return useBattleStore.getState();
}

export default function BattleScreen() {
  const battle = useBattleStore();
  const gameStore = useGameStore();

  // Render-time reads (for UI display only)
  const playerGen = battle.playerTeam[battle.playerActiveIdx];
  const enemyGen = battle.enemyTeam[battle.enemyActiveIdx];
  const playerDef = playerGen ? getGeneralDef(playerGen.defId) : null;
  const enemyDef = enemyGen ? getGeneralDef(enemyGen.defId) : null;
  const playerSkills = playerDef ? playerDef.skills : [];
  const canSwitch = battle.playerTeam.filter((g, i) => i !== battle.playerActiveIdx && isAlive(g)).length > 0;
  const isLocked = playerGen?.specialStates.some((s) => s.type === 'locked') ?? false;
  const [showItems, setShowItems] = useState(false);

  // Track ally fainted & enemy switched flags for conditional skills
  const allyFaintedRef = useRef(false);

  // Apply synergies on first render (battle start)
  const synergiesApplied = useRef(false);
  useEffect(() => {
    if (synergiesApplied.current) return;
    synergiesApplied.current = true;
    const s = getState();
    if (s.playerTeam.length > 1) {
      const { updatedParty, actions } = applySynergyBonuses(s.playerTeam);
      for (let i = 0; i < updatedParty.length; i++) {
        s.updatePlayerGeneral(i, updatedParty[i]!);
      }
      for (const a of actions) s.addLog(a);
    }
  }, []);

  // ===== Core battle execution — reads fresh state via getState() =====
  const executeAction = useCallback((playerAction: { type: 'skill'; skill: SkillDef } | { type: 'switch'; targetIdx: number }) => {
    const s = getState();
    const pGen = s.playerTeam[s.playerActiveIdx];
    const eGen = s.enemyTeam[s.enemyActiveIdx];
    if (!pGen || !eGen || s.isBattleOver) return;

    s.setAnimating(true);

    // --- Check justSwitchedIn: skip turn for freshly switched units ---
    let playerSkipFromSwitch = false;
    let enemySkipFromSwitch = false;
    if (pGen.justSwitchedIn) {
      s.updatePlayerGeneral(s.playerActiveIdx, { justSwitchedIn: false });
      playerSkipFromSwitch = true;
      s.addLog({ type: 'info', actorSide: 'player', message: `${getGeneralDef(pGen.defId).name}刚上场，本回合无法行动。` });
    }
    if (eGen.justSwitchedIn) {
      s.updateEnemyGeneral(s.enemyActiveIdx, { justSwitchedIn: false });
      enemySkipFromSwitch = true;
      s.addLog({ type: 'info', actorSide: 'enemy', message: `${getGeneralDef(eGen.defId).name}刚上场，本回合无法行动。` });
    }

    // --- Turn start: status tick ---
    const pStart = processTurnStart(pGen);
    const eStart = processTurnStart(eGen);

    for (const a of pStart.actions) s.addLog({ ...a, actorSide: 'player' });
    for (const a of eStart.actions) s.addLog({ ...a, actorSide: 'enemy' });

    s.updatePlayerGeneral(s.playerActiveIdx, pStart.patch);
    s.updateEnemyGeneral(s.enemyActiveIdx, eStart.patch);

    // Boss passive (Zhang Jiao — random status every 3 turns)
    {
      const freshE = getState().enemyTeam[getState().enemyActiveIdx]!;
      const bossResult = processBossPassive(freshE, s.turnNumber);
      for (const a of bossResult.actions) s.addLog(a);
      if (bossResult.statusToApply) {
        // Apply status to the player's active general
        const freshP = getState().playerTeam[getState().playerActiveIdx]!;
        if (!freshP.status) {
          s.updatePlayerGeneral(getState().playerActiveIdx, { status: bossResult.statusToApply });
        }
      }
    }

    // Check deaths from status damage
    const pAfter = getState().playerTeam[getState().playerActiveIdx]!;
    const eAfter = getState().enemyTeam[getState().enemyActiveIdx]!;
    if (!isAlive(pAfter)) { handleFaint('player'); s.setAnimating(false); return; }
    if (!isAlive(eAfter)) { handleFaint('enemy'); s.setAnimating(false); return; }

    // --- Determine action order ---
    const aiAction = decideAIAction(eAfter, pAfter, getState().enemyTeam, getState().enemyActiveIdx);

    const playerPriority = playerAction.type === 'switch' ? 99 : playerAction.skill.priority;
    const enemyPriority = aiAction.type === 'switch' ? 99 : aiAction.skill.priority;

    // 赵云 passive: +1 priority when HP < 30%
    let adjustedPlayerPriority = playerPriority;
    if (playerAction.type === 'skill') {
      const pDef = getGeneralDef(pAfter.defId);
      if (pDef.passive.id === 'p_hunshenshidan' && pAfter.currentHP < pAfter.maxHP * 0.3) {
        adjustedPlayerPriority = Math.max(playerPriority, 1);
      }
    }

    let first: 'player' | 'enemy';
    if (adjustedPlayerPriority !== enemyPriority) {
      first = adjustedPlayerPriority > enemyPriority ? 'player' : 'enemy';
    } else {
      first = getFirstActor(pAfter, eAfter, s.turnNumber) === 'a' ? 'player' : 'enemy';
    }

    const turnOrder: Array<{ side: 'player' | 'enemy'; action: typeof playerAction | typeof aiAction; skip: boolean }> = [
      { side: first, action: first === 'player' ? playerAction : aiAction, skip: (first === 'player' ? pStart.skipTurn : eStart.skipTurn) || (first === 'player' ? playerSkipFromSwitch : enemySkipFromSwitch) },
      { side: first === 'player' ? 'enemy' : 'player', action: first === 'player' ? aiAction : playerAction, skip: (first === 'player' ? eStart.skipTurn : pStart.skipTurn) || (first === 'player' ? enemySkipFromSwitch : playerSkipFromSwitch) },
    ];

    // --- Execute each actor's turn ---
    let enemySwitchedThisTurn = false;

    for (const turn of turnOrder) {
      if (turn.skip) continue;

      // Fresh reads every iteration
      const st = getState();
      const actor = turn.side === 'player'
        ? st.playerTeam[st.playerActiveIdx]!
        : st.enemyTeam[st.enemyActiveIdx]!;
      const target = turn.side === 'player'
        ? st.enemyTeam[st.enemyActiveIdx]!
        : st.playerTeam[st.playerActiveIdx]!;

      if (!isAlive(actor) || !isAlive(target)) continue;

      // --- Switch ---
      if (turn.action.type === 'switch') {
        if (turn.side === 'enemy') enemySwitchedThisTurn = true;
        if (turn.side === 'player') {
          const locked = actor.specialStates.some((sp) => sp.type === 'locked');
          if (locked) {
            st.addLog({ type: 'info', actorSide: 'player', message: '被锁定，无法换将！' });
            continue;
          }
          st.setPlayerActive(turn.action.targetIdx);
          st.updatePlayerGeneral(turn.action.targetIdx, { justSwitchedIn: true });
          const newGen = st.playerTeam[turn.action.targetIdx]!;
          st.addLog({ type: 'switch', actorSide: 'player', message: `换上了${getGeneralDef(newGen.defId).name}！` });
          // On switch-in passives
          const freshTarget = getState().enemyTeam[getState().enemyActiveIdx]!;
          const switchResult = onSwitchIn(newGen, freshTarget);
          for (const a of switchResult.actions) st.addLog({ ...a, actorSide: 'player' });
          if (Object.keys(switchResult.selfPatch).length) st.updatePlayerGeneral(turn.action.targetIdx, switchResult.selfPatch);
          if (Object.keys(switchResult.opponentPatch).length) st.updateEnemyGeneral(getState().enemyActiveIdx, switchResult.opponentPatch);
        }
        continue;
      }

      const skill = turn.action.skill;

      // --- Confusion self-hit ---
      if (actor.status?.type === 'confusion' && Math.random() < 0.33) {
        const selfDmg = confusionSelfDamage(actor);
        const newHP = clampHP(actor, actor.currentHP - selfDmg);
        const updateFn = turn.side === 'player' ? st.updatePlayerGeneral : st.updateEnemyGeneral;
        const idx = turn.side === 'player' ? st.playerActiveIdx : st.enemyActiveIdx;
        updateFn(idx, { currentHP: newHP });
        st.addLog({ type: 'status', actorSide: turn.side, message: `混乱中攻击了自己，受到${selfDmg}点伤害！`, damage: selfDmg });
        if (newHP <= 0) { handleFaint(turn.side); continue; }
        continue;
      }

      // --- Accuracy check (with multi-hit accuracy bonus from 太史慈) ---
      const accBonus = getHitCount(skill) > 1 ? getMultiHitAccuracyBonus(actor) : 0;
      if (!accuracyCheck(skill, accBonus)) {
        st.addLog({ type: 'skill', actorSide: turn.side, message: `${skill.name}未命中！` });
        // Still deduct energy on miss
        if (turn.side === 'player') {
          st.updatePlayerGeneral(st.playerActiveIdx, {
            energy: Math.max(0, actor.energy - skill.energyCost),
          });
        }
        continue;
      }

      // --- Deduct energy ---
      if (turn.side === 'player') {
        st.updatePlayerGeneral(st.playerActiveIdx, {
          energy: Math.max(0, actor.energy - skill.energyCost),
        });
      }

      // --- Deal damage (with multi-hit support) ---
      if (skill.power > 0) {
        const hitCount = getHitCount(skill);
        let totalDmg = 0;

        for (let hit = 0; hit < hitCount; hit++) {
          // Re-read target each hit (HP may have changed)
          const freshActor = turn.side === 'player'
            ? getState().playerTeam[getState().playerActiveIdx]!
            : getState().enemyTeam[getState().enemyActiveIdx]!;
          const freshTarget = turn.side === 'player'
            ? getState().enemyTeam[getState().enemyActiveIdx]!
            : getState().playerTeam[getState().playerActiveIdx]!;

          if (!isAlive(freshTarget)) break;

          const isPlayerSide = turn.side === 'player';
          const dmgResult = calcDamage(
            freshActor, freshTarget, skill, getState().turnNumber,
            getSynergyCritBonus(isPlayerSide ? getState().playerTeam : []),
            isPlayerSide ? allyFaintedRef.current : false,
            isPlayerSide ? enemySwitchedThisTurn : false,
          );

          // Capture stance value BEFORE applyDamage removes it
          const stanceState = freshTarget.specialStates.find(sp => sp.type === 'stance');
          const stanceValue = stanceState?.value ?? 0;

          const { shieldAbsorbed, patch: dmgPatch, stanceTriggered } = applyDamage(freshTarget, dmgResult.damage);
          totalDmg += dmgResult.damage;

          const targetUpdateFn = turn.side === 'player' ? st.updateEnemyGeneral : st.updatePlayerGeneral;
          const targetIdx = turn.side === 'player' ? getState().enemyActiveIdx : getState().playerActiveIdx;
          targetUpdateFn(targetIdx, dmgPatch);

          // Resolve stance if triggered
          if (stanceTriggered && stanceValue > 0) {
            const updatedTarget = turn.side === 'player'
              ? getState().enemyTeam[getState().enemyActiveIdx]!
              : getState().playerTeam[getState().playerActiveIdx]!;
            const stanceResult = resolveStance(updatedTarget, stanceValue);
            for (const a of stanceResult.actions) st.addLog({ ...a, actorSide: turn.side === 'player' ? 'enemy' : 'player' });
            if (Object.keys(stanceResult.patch).length) targetUpdateFn(targetIdx, stanceResult.patch);
          }

          let msg = hitCount > 1
            ? `第${hit + 1}击！造成${dmgResult.damage}点伤害`
            : `${getGeneralDef(freshActor.defId).name}使用${skill.name}，造成${dmgResult.damage}点伤害`;
          if (dmgResult.crit) msg += '（暴击！）';
          if (hit === 0 && dmgResult.effectiveness === 'super') msg += '（克制！）';
          if (hit === 0 && dmgResult.effectiveness === 'resist') msg += '（被克）';
          if (shieldAbsorbed > 0) msg += `（护盾吸收${shieldAbsorbed}）`;
          st.addLog({ type: 'skill', actorSide: turn.side, message: msg, damage: dmgResult.damage });

          // Passive: on damage taken
          const passiveResult = onDamageTaken(freshTarget, freshActor, dmgResult.damage, skill.type);
          for (const a of passiveResult.actions) st.addLog(a);
          if (Object.keys(passiveResult.defenderPatch).length) targetUpdateFn(targetIdx, passiveResult.defenderPatch);
          if (passiveResult.reflectDamage > 0) {
            const { patch: reflPatch } = applyDamage(freshActor, passiveResult.reflectDamage);
            const actorUpdateFn = turn.side === 'player' ? st.updatePlayerGeneral : st.updateEnemyGeneral;
            const actorIdx = turn.side === 'player' ? getState().playerActiveIdx : getState().enemyActiveIdx;
            actorUpdateFn(actorIdx, reflPatch);
          }

          // Counter damage
          const counterDmg = calcCounterDamage(freshTarget, dmgResult.damage);
          if (counterDmg > 0 && skill.type === 'martial') {
            const { patch: counterPatch } = applyDamage(freshActor, counterDmg);
            const actorUpdateFn = turn.side === 'player' ? st.updatePlayerGeneral : st.updateEnemyGeneral;
            const actorIdx = turn.side === 'player' ? getState().playerActiveIdx : getState().enemyActiveIdx;
            actorUpdateFn(actorIdx, counterPatch);
            st.addLog({ type: 'info', actorSide: turn.side === 'player' ? 'enemy' : 'player', message: `反击！造成${counterDmg}点伤害`, damage: counterDmg });
          }
        }

        if (hitCount > 1) {
          st.addLog({ type: 'info', actorSide: turn.side, message: `${skill.name}共命中${hitCount}次，总计${totalDmg}点伤害！` });
        }

        // Check faint after all hits
        const finalTarget = turn.side === 'player'
          ? getState().enemyTeam[getState().enemyActiveIdx]!
          : getState().playerTeam[getState().playerActiveIdx]!;
        if (!isAlive(finalTarget)) {
          handleFaint(turn.side === 'player' ? 'enemy' : 'player');
          continue;
        }
      } else {
        st.addLog({ type: 'skill', actorSide: turn.side, message: `${getGeneralDef(actor.defId).name}使用了${skill.name}！` });
      }

      // --- Apply skill effects ---
      {
        const freshActor = turn.side === 'player'
          ? getState().playerTeam[getState().playerActiveIdx]!
          : getState().enemyTeam[getState().enemyActiveIdx]!;
        const freshTarget = turn.side === 'player'
          ? getState().enemyTeam[getState().enemyActiveIdx]!
          : getState().playerTeam[getState().playerActiveIdx]!;

        const effectResult = applySkillEffects(skill, freshActor, freshTarget);
        for (const a of effectResult.actions) st.addLog({ ...a, actorSide: turn.side });

        if (turn.side === 'player') {
          if (Object.keys(effectResult.attackerPatch).length) st.updatePlayerGeneral(getState().playerActiveIdx, effectResult.attackerPatch);
          if (Object.keys(effectResult.defenderPatch).length) st.updateEnemyGeneral(getState().enemyActiveIdx, effectResult.defenderPatch);
        } else {
          if (Object.keys(effectResult.attackerPatch).length) st.updateEnemyGeneral(getState().enemyActiveIdx, effectResult.attackerPatch);
          if (Object.keys(effectResult.defenderPatch).length) st.updatePlayerGeneral(getState().playerActiveIdx, effectResult.defenderPatch);
        }

        // Passive: on skill used (陆逊 extra burn, 庞统 RES-1, 徐晃 DEF-1)
        const passiveSkillResult = onSkillUsed(freshActor, skill);
        if (passiveSkillResult.extraDefDown > 0 && skill.power > 0) {
          const tgt = turn.side === 'player'
            ? getState().enemyTeam[getState().enemyActiveIdx]!
            : getState().playerTeam[getState().playerActiveIdx]!;
          const stat = getGeneralDef(freshActor.defId).passive.id === 'p_fengchu' ? 'res' : 'def';
          const cur = tgt.statStages[stat];
          if (cur > -3) {
            const tgtUpdateFn = turn.side === 'player' ? st.updateEnemyGeneral : st.updatePlayerGeneral;
            const tgtIdx = turn.side === 'player' ? getState().enemyActiveIdx : getState().playerActiveIdx;
            tgtUpdateFn(tgtIdx, { statStages: { ...tgt.statStages, [stat]: cur - 1 } });
            st.addLog({ type: 'info', message: `被动效果：${stat.toUpperCase()} 降低了1级！` });
          }
        }

        // Synergy triggers (player side only)
        if (turn.side === 'player' && skill.power > 0) {
          const synResult = checkTriggerSynergy(
            freshActor, skill, getState().playerTeam,
            getState().enemyTeam[getState().enemyActiveIdx]!,
          );
          for (const a of synResult.actions) st.addLog(a);
          if (synResult.bonusDamage > 0) {
            const { patch: synPatch } = applyDamage(
              getState().enemyTeam[getState().enemyActiveIdx]!,
              synResult.bonusDamage,
            );
            st.updateEnemyGeneral(getState().enemyActiveIdx, synPatch);
            // Check faint from synergy damage
            if (!isAlive({ ...getState().enemyTeam[getState().enemyActiveIdx]!, ...synPatch })) {
              handleFaint('enemy');
            }
          }
          if (synResult.bonusBurn) {
            const eTarget = getState().enemyTeam[getState().enemyActiveIdx]!;
            if (!eTarget.status) {
              st.updateEnemyGeneral(getState().enemyActiveIdx, { status: { type: 'burn', turnsLeft: 3 } });
            }
          }
          if (synResult.bonusHealAll > 0) {
            const team = getState().playerTeam;
            for (let i = 0; i < team.length; i++) {
              const g = team[i]!;
              if (isAlive(g)) {
                const heal = Math.floor(g.maxHP * synResult.bonusHealAll / 100);
                st.updatePlayerGeneral(i, { currentHP: clampHP(g, g.currentHP + heal) });
              }
            }
          }
        }
      }
    }

    getState().nextTurn();
    getState().setIsPlayerTurn(true);
    getState().setAnimating(false);
  }, []);

  function handleFaint(side: 'player' | 'enemy') {
    const s = getState();
    const team = side === 'player' ? s.playerTeam : s.enemyTeam;
    const activeIdx = side === 'player' ? s.playerActiveIdx : s.enemyActiveIdx;
    const faintedGen = team[activeIdx];
    if (!faintedGen) return;
    const faintedDef = getGeneralDef(faintedGen.defId);
    s.addLog({ type: 'faint', actorSide: side, message: `${faintedDef.name}被击败了！` });

    // Lv Bu second phase: revive once with full HP + all stats +20% (via +1 stage each)
    if (side === 'enemy' && faintedDef.id === 'lv_bu' && !faintedGen.specialStates.some(sp => sp.type === 'doom')) {
      const newMaxHP = faintedGen.maxHP;
      s.updateEnemyGeneral(activeIdx, {
        currentHP: newMaxHP,
        statStages: { hp: 0, atk: 1, int: 1, def: 1, res: 1, spd: 1 },
        status: null,
        specialStates: [{ type: 'doom', turnsLeft: 99, value: 1 }], // mark as phase 2
      });
      s.addLog({ type: 'info', actorSide: 'enemy', message: `吕布·无双：狂暴觉醒！全属性提升！` });
      return;
    }

    // Track ally fainted for 单骑救主
    if (side === 'player') allyFaintedRef.current = true;

    // Killer passive: 甘宁·锦帆 SPD+1
    if (side === 'enemy') {
      const killerIdx = s.playerActiveIdx;
      const killer = s.playerTeam[killerIdx]!;
      const faintResult = onEnemyFaint(killer);
      if (faintResult.actions.length) {
        for (const a of faintResult.actions) s.addLog(a);
        if (Object.keys(faintResult.patch).length) s.updatePlayerGeneral(killerIdx, faintResult.patch);
      }
    }

    const nextIdx = team.findIndex((g, i) => i !== activeIdx && isAlive(g));

    if (nextIdx === -1) {
      s.endBattle(side === 'enemy');
    } else {
      const nextName = getGeneralDef(team[nextIdx]!.defId).name;
      if (side === 'enemy') {
        s.setEnemyActive(nextIdx);
        s.updateEnemyGeneral(nextIdx, { justSwitchedIn: true });
        s.addLog({ type: 'switch', actorSide: 'enemy', message: `对方换上了${nextName}！` });
      } else {
        s.setPlayerActive(nextIdx);
        s.updatePlayerGeneral(nextIdx, { justSwitchedIn: true });
        s.addLog({ type: 'switch', actorSide: 'player', message: `换上了${nextName}！` });
      }
    }
  }

  function handleBattleEnd() {
    const s = getState();
    const won = s.playerWon;
    // Revive 0-HP generals to 1 HP after battle
    const postBattleTeam = s.playerTeam.map(g => g.currentHP <= 0 ? { ...g, currentHP: 1 } : g);
    gameStore.setParty(postBattleTeam);
    if (won) {
      const reward = 30 + Math.floor(Math.random() * 30) + gameStore.act * 10;
      gameStore.addGold(reward);
      const currentNode = gameStore.mapNodes.find((n) => n.id === gameStore.currentNodeId);
      if (currentNode?.type === 'wild') {
        gameStore.setPhase('capture');
      } else if (currentNode?.type === 'boss') {
        if (gameStore.act < 3) {
          const nextAct = gameStore.act + 1;
          gameStore.setAct(nextAct);
          const newMap = generateMap(nextAct);
          gameStore.setMap(newMap);
          gameStore.setCurrentNode(newMap[0]?.id ?? null);
          gameStore.setPhase('map');
        } else {
          gameStore.setWon(true);
          gameStore.setPhase('result');
        }
      } else {
        gameStore.setPhase('map');
      }
    } else {
      gameStore.setWon(false);
      gameStore.setPhase('result');
    }
  }

  if (!playerGen || !enemyGen) return null;

  const playerHpPct = playerGen.maxHP > 0 ? playerGen.currentHP / playerGen.maxHP : 0;
  const enemyHpPct = enemyGen.maxHP > 0 ? enemyGen.currentHP / enemyGen.maxHP : 0;
  const energyPct = playerGen.energy / MAX_ENERGY;

  // Weapon advantage text between player and enemy
  const advantageText = playerDef && enemyDef ? getAdvantageText(playerDef.weapon, enemyDef.weapon) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar: turn counter */}
      <div style={{
        textAlign: 'center', padding: '8px 0', fontSize: 13,
        background: 'var(--color-bg-panel)', borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{ color: 'var(--color-text-dim)' }}>
          回合 {battle.turnNumber}
        </span>
      </div>

      {/* Enemy area */}
      <div style={{ padding: '16px 16px 8px', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{WEAPON_EMOJI[enemyDef!.weapon]}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{enemyDef!.name}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {WEAPON_LABEL[enemyDef!.weapon]} Lv.{enemyGen.level}
          </span>
          {enemyGen.status && <span>{STATUS_EMOJI[enemyGen.status.type]}</span>}
          {advantageText && (
            <span style={{
              fontSize: 12, fontWeight: 'bold',
              color: advantageText === '克制!' ? 'var(--color-hp)' : 'var(--color-hp-low)',
            }}>
              {advantageText}
            </span>
          )}
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${enemyHpPct * 100}%`,
            background: enemyHpPct > 0.5 ? 'var(--color-hp)' : 'var(--color-hp-low)',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>
          {enemyGen.currentHP}/{enemyGen.maxHP}
        </div>
      </div>

      {/* Battle log */}
      <div
        className="scroll-area"
        style={{
          flex: 1, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-dim)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2,
          borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
        }}
      >
        {battle.log.slice(-10).map((entry, i) => (
          <div key={i} style={{
            color: entry.type === 'faint' ? 'var(--color-hp-low)' :
              entry.damage ? 'var(--color-fire)' :
              entry.heal ? 'var(--color-hp)' :
              'var(--color-text-dim)',
          }}>
            {entry.message}
          </div>
        ))}
      </div>

      {/* Player area */}
      <div style={{ padding: '8px 16px 4px', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>{WEAPON_EMOJI[playerDef!.weapon]}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{playerDef!.name}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
            {WEAPON_LABEL[playerDef!.weapon]} Lv.{playerGen.level}
          </span>
          {playerGen.status && <span>{STATUS_EMOJI[playerGen.status.type]}</span>}
        </div>
        {/* HP bar */}
        <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, transition: 'width 0.3s',
            width: `${playerHpPct * 100}%`,
            background: playerHpPct > 0.5 ? 'var(--color-hp)' : 'var(--color-hp-low)',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>
          {playerGen.currentHP}/{playerGen.maxHP}
        </div>
        {/* Energy bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--color-gold)', minWidth: 28 }}>EN</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.3s',
              width: `${energyPct * 100}%`,
              background: 'var(--color-gold)',
            }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-dim)', minWidth: 32, textAlign: 'right' }}>
            {playerGen.energy}/{MAX_ENERGY}
          </span>
        </div>
      </div>

      {/* Actions */}
      {battle.isBattleOver ? (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{
            fontSize: 24, fontFamily: 'var(--font-display)', marginBottom: 12,
            color: battle.playerWon ? 'var(--color-gold)' : 'var(--color-hp-low)',
          }}>
            {battle.playerWon ? '胜利！' : '战败...'}
          </div>
          <button className="primary" onClick={handleBattleEnd} style={{ width: '100%' }}>
            继续
          </button>
        </div>
      ) : (
        <div style={{ padding: '8px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {playerSkills.map((skill) => {
            const canAfford = skill.energyCost <= playerGen.energy;
            return (
              <button
                key={skill.id}
                disabled={battle.animating || !canAfford}
                onClick={() => {
                  battle.setIsPlayerTurn(false);
                  executeAction({ type: 'skill', skill });
                }}
                style={{
                  textAlign: 'left', padding: '10px 12px',
                  opacity: canAfford ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 'bold' }}>
                  {skill.name}
                  <span style={{ fontWeight: 'normal', fontSize: 11, marginLeft: 6, color: 'var(--color-text-dim)' }}>
                    {skill.energyCost > 0 ? `⚡${skill.energyCost}` : '免费'}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 2, lineHeight: 1.3 }}>
                  {skill.description}
                </div>
              </button>
            );
          })}
          <button
            disabled={battle.animating || !canSwitch || isLocked}
            onClick={() => {
              const idx = battle.playerTeam.findIndex((g, i) => i !== battle.playerActiveIdx && isAlive(g));
              if (idx >= 0) {
                battle.setIsPlayerTurn(false);
                executeAction({ type: 'switch', targetIdx: idx });
              }
            }}
          >
            换将
          </button>
          <button
            disabled={battle.animating}
            onClick={() => setShowItems(!showItems)}
            style={{ background: showItems ? 'var(--color-bg-card)' : undefined }}
          >
            道具
          </button>
        </div>
      )}

      {/* Battle item overlay */}
      {showItems && !battle.isBattleOver && (
        <div style={{
          position: 'absolute', bottom: 140, left: 12, right: 12,
          background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: 12, zIndex: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>选择战斗道具（不消耗回合）</div>
          {(() => {
            const battleItems = gameStore.inventory.items.filter((inv) => {
              const item = ITEMS[inv.itemId];
              return item?.category === 'battle' && inv.count > 0;
            });
            if (battleItems.length === 0) return <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>无可用战斗道具</div>;
            return battleItems.map((inv) => {
              const item = ITEMS[inv.itemId]!;
              return (
                <button
                  key={inv.itemId}
                  onClick={() => {
                    // Free action: apply item immediately, don't consume turn
                    setShowItems(false);
                    const s = getState();
                    const actor = s.playerTeam[s.playerActiveIdx]!;
                    useGameStore.getState().removeItem(inv.itemId);
                    const eff = item.effect as Record<string, unknown>;
                    if ('healPercent' in eff) {
                      const heal = Math.floor(actor.maxHP * (eff.healPercent as number) / 100);
                      s.updatePlayerGeneral(s.playerActiveIdx, { currentHP: clampHP(actor, actor.currentHP + heal) });
                      s.addLog({ type: 'info', actorSide: 'player', message: `使用${item.name}，恢复${heal}点HP！`, heal });
                    }
                    if ('statChange' in eff) {
                      const changes = Array.isArray(eff.statChange) ? eff.statChange : [eff.statChange];
                      const tgt = eff.target === 'enemy'
                        ? s.enemyTeam[s.enemyActiveIdx]! : actor;
                      const tgtUpdateFn = eff.target === 'enemy' ? s.updateEnemyGeneral : s.updatePlayerGeneral;
                      const tgtIdx = eff.target === 'enemy' ? s.enemyActiveIdx : s.playerActiveIdx;
                      let newStages = { ...tgt.statStages };
                      for (const ch of changes as Array<{ stat: string; stages: number }>) {
                        const k = ch.stat as keyof typeof newStages;
                        newStages = { ...newStages, [k]: Math.max(-3, Math.min(3, newStages[k] + ch.stages)) };
                      }
                      tgtUpdateFn(tgtIdx, { statStages: newStages });
                      s.addLog({ type: 'info', actorSide: 'player', message: `使用${item.name}！` });
                    }
                    // Player can still select a skill after using item
                  }}
                  style={{ width: '100%', textAlign: 'left', marginBottom: 4, padding: '8px 12px' }}
                >
                  <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                  <span style={{ color: 'var(--color-text-dim)', marginLeft: 8 }}>x{inv.count}</span>
                  <span style={{ float: 'right', fontSize: 11, color: 'var(--color-text-dim)' }}>{item.description}</span>
                </button>
              );
            });
          })()}
          <button onClick={() => setShowItems(false)} style={{ width: '100%', marginTop: 4, fontSize: 12 }}>取消</button>
        </div>
      )}
    </div>
  );
}
