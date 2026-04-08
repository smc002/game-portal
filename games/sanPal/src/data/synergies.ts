import type { SynergyDef } from './types';

export const SYNERGIES: SynergyDef[] = [
  // ===== Passive Synergies (always active when conditions met) =====
  {
    id: 'taoyuan', name: '桃园结义', type: 'passive',
    requiredGenerals: ['liu_bei', 'guan_yu', 'zhang_fei'],
    description: '刘备+关羽+张飞：三人ATK+15%，HP+10%',
  },
  {
    id: 'wolong_fengchu', name: '卧龙凤雏', type: 'passive',
    requiredGenerals: ['zhuge_liang', 'pang_tong'],
    description: '诸葛亮+庞统：二人INT+20%，计策PP+1',
  },
  {
    id: 'wuhu', name: '五虎将', type: 'passive',
    requiredGenerals: ['guan_yu', 'zhang_fei', 'zhao_yun', 'ma_chao', 'huang_zhong'],
    minCount: 3,
    description: '五虎将任意3人：SPD+15%',
  },
  {
    id: 'hubaoqi', name: '虎豹骑', type: 'passive',
    requiredGenerals: ['cao_cao', 'xu_chu', 'dian_wei', 'xu_huang', 'zhang_he'],
    minCount: 3,
    description: '曹操+任意2名魏国猛将：全队DEF+10%',
  },
  {
    id: 'jiangdong', name: '江东双璧', type: 'passive',
    requiredGenerals: ['zhou_yu', 'sun_ce'],
    description: '周瑜+孙策：二人暴击率+15%',
  },

  // ===== Trigger Synergies (proc on skill use) =====
  {
    id: 'guan_zhang', name: '兄弟同心', type: 'trigger',
    requiredGenerals: ['guan_yu', 'zhang_fei'],
    description: '关羽使用武技时30%概率张飞追击（50%威力）',
  },
  {
    id: 'zhuge_zhao', name: '龙胆智辅', type: 'trigger',
    requiredGenerals: ['zhuge_liang', 'zhao_yun'],
    description: '诸葛亮使用计策时25%概率赵云先制追击',
  },
  {
    id: 'zhou_huang', name: '苦肉连环', type: 'trigger',
    requiredGenerals: ['zhou_yu', 'huang_gai'],
    description: '周瑜使用火系技能时40%概率黄盖对敌施加灼烧',
  },
  {
    id: 'cao_dian', name: '古之恶来', type: 'trigger',
    requiredGenerals: ['cao_cao', 'dian_wei'],
    description: '曹操受攻击时35%概率典韦替曹操承受50%伤害',
  },
  {
    id: 'liu_zhuge', name: '鱼水之情', type: 'trigger',
    requiredGenerals: ['liu_bei', 'zhuge_liang'],
    description: '刘备使用辅助技能时30%概率诸葛亮额外恢复全队10%HP',
  },
];
