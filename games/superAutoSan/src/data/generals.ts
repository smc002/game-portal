import type { GeneralDef } from './types';

export const generals: GeneralDef[] = [
  // ===== TIER 1 - 小兵 =====
  { id: 'huangjinbing', name: '黄巾兵', originalName: 'Ant', tier: 1, baseAtk: 2, baseHp: 1, trigger: 'faint', abilityDesc: '【阵亡时】临终激励：随机友方 +2/+1' },
  { id: 'minfu', name: '民夫', originalName: 'Beaver', tier: 1, baseAtk: 3, baseHp: 2, trigger: 'sell', abilityDesc: '【出售时】修筑工事：2个随机友方 +1 HP' },
  { id: 'sishi', name: '死士', originalName: 'Cricket', tier: 1, baseAtk: 1, baseHp: 2, trigger: 'faint', abilityDesc: '【阵亡时】亡魂不散：召唤 1/1 亡灵死士' },
  { id: 'huofu', name: '伙夫', originalName: 'Duck', tier: 1, baseAtk: 2, baseHp: 3, trigger: 'sell', abilityDesc: '【出售时】军粮供给：商店武将 +1 HP' },
  { id: 'jiaotou', name: '教头', originalName: 'Fish', tier: 1, baseAtk: 2, baseHp: 2, trigger: 'levelUp', abilityDesc: '【升级时】练兵：所有友方 +1/+1' },
  { id: 'chihou', name: '斥候', originalName: 'Horse', tier: 1, baseAtk: 2, baseHp: 1, trigger: 'friendSummoned', abilityDesc: '【友方召唤时】通风报信：召唤的友方 +1 ATK（临时）' },
  { id: 'cike', name: '刺客', originalName: 'Mosquito', tier: 1, baseAtk: 2, baseHp: 2, trigger: 'startOfBattle', abilityDesc: '【战斗开始】暗箭伤人：对1个随机敌人造成1伤害' },
  { id: 'junxuguan', name: '军需官', originalName: 'Otter', tier: 1, baseAtk: 1, baseHp: 2, trigger: 'buy', abilityDesc: '【购买时】补给分配：随机1个友方 +1/+1' },
  { id: 'shanggu', name: '商贾', originalName: 'Pig', tier: 1, baseAtk: 4, baseHp: 1, trigger: 'sell', abilityDesc: '【出售时】生财有道：获得1额外金币' },
  { id: 'xinshi', name: '信使', originalName: 'Pigeon', tier: 1, baseAtk: 3, baseHp: 1, trigger: 'sell', abilityDesc: '【出售时】飞鸽传书：商店补充1个免费干粮' },

  // ===== TIER 2 - 无名武将 =====
  { id: 'chendao', name: '陈到', originalName: 'Crab', tier: 2, baseAtk: 3, baseHp: 1, trigger: 'startOfBattle', abilityDesc: '【战斗开始】白毦护卫：复制最高HP友方的50% HP' },
  { id: 'chengong', name: '陈宫', originalName: 'Dodo', tier: 2, baseAtk: 3, baseHp: 3, trigger: 'startOfBattle', abilityDesc: '【战斗开始】献策：给前方友方 +33% ATK' },
  { id: 'wutugu', name: '兀突骨', originalName: 'Elephant', tier: 2, baseAtk: 3, baseHp: 5, trigger: 'afterAttack', abilityDesc: '【攻击后】蛮力冲撞：对后方友方造成1伤害' },
  { id: 'caiwenji', name: '蔡文姬', originalName: 'Flamingo', tier: 2, baseAtk: 4, baseHp: 2, trigger: 'faint', abilityDesc: '【阵亡时】悲歌：后方2个友方 +1/+1' },
  { id: 'hjlishi', name: '黄巾力士', originalName: 'Hedgehog', tier: 2, baseAtk: 3, baseHp: 2, trigger: 'faint', abilityDesc: '【阵亡时】同归于尽：对所有武将造成2伤害' },
  { id: 'zhoucang', name: '周仓', originalName: 'Kangaroo', tier: 2, baseAtk: 1, baseHp: 2, trigger: 'friendAheadAttacks', abilityDesc: '【前方友方攻击时】助威：+2/+2' },
  { id: 'zhurong', name: '祝融夫人', originalName: 'Peacock', tier: 2, baseAtk: 2, baseHp: 5, trigger: 'hurt', abilityDesc: '【受伤时】怒火焚身：+4 ATK' },
  { id: 'yangsong', name: '杨松', originalName: 'Rat', tier: 2, baseAtk: 4, baseHp: 5, trigger: 'faint', abilityDesc: '【阵亡时】叛徒：在对方场上召唤1/1内奸' },
  { id: 'mizhu', name: '糜竺', originalName: 'Shrimp', tier: 2, baseAtk: 2, baseHp: 3, trigger: 'friendSold', abilityDesc: '【友方出售时】商贾之才：随机友方 +1 HP' },
  { id: 'zuoci', name: '左慈', originalName: 'Spider', tier: 2, baseAtk: 2, baseHp: 2, trigger: 'faint', abilityDesc: '【阵亡时】幻术：召唤1个Tier3 Lv1武将（2/2）' },
  { id: 'zhenji', name: '甄姬', originalName: 'Swan', tier: 2, baseAtk: 1, baseHp: 3, trigger: 'startOfTurn', abilityDesc: '【回合开始】洛神赋：+1金币' },
  { id: 'xujing', name: '许靖', originalName: 'Worm', tier: 2, baseAtk: 1, baseHp: 3, trigger: 'startOfTurn', abilityDesc: '【回合开始】举荐：商店补充1个2金馒头' },

  // ===== TIER 3 - 知名武将（初） =====
  { id: 'dianwei', name: '典韦', originalName: 'Badger', tier: 3, baseAtk: 5, baseHp: 3, trigger: 'faint', abilityDesc: '【阵亡时】死战不退：对相邻武将造成50% ATK伤害' },
  { id: 'ganning', name: '甘宁', originalName: 'Blowfish', tier: 3, baseAtk: 3, baseHp: 5, trigger: 'hurt', abilityDesc: '【受伤时】百骑劫营：对随机敌人造成2伤害' },
  { id: 'huangzhong', name: '黄忠', originalName: 'Camel', tier: 3, baseAtk: 2, baseHp: 6, trigger: 'hurt', abilityDesc: '【受伤时】老当益壮：后方友方 +2/+2' },
  { id: 'liubei', name: '刘备', originalName: 'Dog', tier: 3, baseAtk: 3, baseHp: 4, trigger: 'friendSummoned', abilityDesc: '【友方召唤时】仁德之心：+1/+1（临时）' },
  { id: 'huanggai', name: '黄盖', originalName: 'Dolphin', tier: 3, baseAtk: 4, baseHp: 3, trigger: 'startOfBattle', abilityDesc: '【战斗开始】苦肉计：对最低HP敌人造成3伤害' },
  { id: 'xunyu', name: '荀彧', originalName: 'Giraffe', tier: 3, baseAtk: 1, baseHp: 3, trigger: 'endOfTurn', abilityDesc: '【回合结束】居中持重：前方1个友方 +1/+1' },
  { id: 'xuchu', name: '许褚', originalName: 'Ox', tier: 3, baseAtk: 1, baseHp: 3, trigger: 'friendAheadFaints', abilityDesc: '【前方友方阵亡时】虎痴之怒：获得铁甲锦囊，+1 ATK' },
  { id: 'huatuo', name: '华佗', originalName: 'Rabbit', tier: 3, baseAtk: 1, baseHp: 2, trigger: 'friendEatsFood', abilityDesc: '【友方使用道具时】妙手回春：该友方 +1 HP' },
  { id: 'zhangren', name: '张任', originalName: 'Sheep', tier: 3, baseAtk: 2, baseHp: 2, trigger: 'faint', abilityDesc: '【阵亡时】誓死守城：召唤2个2/2守军' },
  { id: 'xushu', name: '徐庶', originalName: 'Snail', tier: 3, baseAtk: 2, baseHp: 2, trigger: 'buy', abilityDesc: '【购买时】雪中送炭：若上局失败，所有友方 +1/+1' },

  // ===== TIER 4 - 知名武将（中） =====
  { id: 'machao', name: '马超', originalName: 'Bison', tier: 4, baseAtk: 4, baseHp: 4, trigger: 'endOfTurn', abilityDesc: '【回合结束】锦马超：若有Lv3友方，+2/+2' },
  { id: 'pangtong', name: '庞统', originalName: 'Deer', tier: 4, baseAtk: 1, baseHp: 1, trigger: 'faint', abilityDesc: '【阵亡时】落凤坡：召唤5/5火阵（带烈焰锦囊）' },
  { id: 'zhangfei', name: '张飞', originalName: 'Hippo', tier: 4, baseAtk: 4, baseHp: 5, trigger: 'knockOut', abilityDesc: '【击杀时】万夫不当：+3/+3' },
  { id: 'simayi', name: '司马懿', originalName: 'Parrot', tier: 4, baseAtk: 4, baseHp: 2, trigger: 'endOfTurn', abilityDesc: '【回合结束】鹰视狼顾：复制前方武将能力（Lv1）' },
  { id: 'lusu', name: '鲁肃', originalName: 'Penguin', tier: 4, baseAtk: 2, baseHp: 4, trigger: 'endOfTurn', abilityDesc: '【回合结束】联盟之谊：2个Lv2+友方 +1/+1' },
  { id: 'sunce', name: '孙策', originalName: 'Rooster', tier: 4, baseAtk: 5, baseHp: 3, trigger: 'faint', abilityDesc: '【阵亡时】小霸王：召唤1个小将（1HP，50% ATK）' },
  { id: 'jiaxu', name: '贾诩', originalName: 'Skunk', tier: 4, baseAtk: 3, baseHp: 5, trigger: 'startOfBattle', abilityDesc: '【战斗开始】毒计：最高HP敌人HP -33%' },
  { id: 'mifuren', name: '糜夫人', originalName: 'Squirrel', tier: 4, baseAtk: 2, baseHp: 5, trigger: 'startOfTurn', abilityDesc: '【回合开始】持家有道：商店道具 -1金币' },
  { id: 'zhaoyun', name: '赵云', originalName: 'Turtle', tier: 4, baseAtk: 2, baseHp: 5, trigger: 'faint', abilityDesc: '【阵亡时】长坂护主：后方1个友方获得铁甲锦囊' },
  { id: 'zhouyu', name: '周瑜', originalName: 'Whale', tier: 4, baseAtk: 3, baseHp: 8, trigger: 'startOfBattle', abilityDesc: '【战斗开始】火攻：吞噬前方友方，阵亡时释放（Lv1）' },

  // ===== TIER 5 - 名将 =====
  { id: 'sunshangxiang', name: '孙尚香', originalName: 'Cow', tier: 5, baseAtk: 4, baseHp: 6, trigger: 'buy', abilityDesc: '【购买时】嫁妆：商店道具替换为2个免费军粮（+1/+2）' },
  { id: 'zhangliao', name: '张辽', originalName: 'Crocodile', tier: 5, baseAtk: 8, baseHp: 4, trigger: 'startOfBattle', abilityDesc: '【战斗开始】威震逍遥津：对最后方敌人造成8伤害' },
  { id: 'pangde', name: '庞德', originalName: 'Monkey', tier: 5, baseAtk: 1, baseHp: 2, trigger: 'endOfTurn', abilityDesc: '【回合结束】抬棺决死：最右友方 +2/+3' },
  { id: 'guanyu', name: '关羽', originalName: 'Rhino', tier: 5, baseAtk: 5, baseHp: 8, trigger: 'knockOut', abilityDesc: '【击杀时】过五关斩六将：对第一个敌人造成4伤害（T1双倍）' },
  { id: 'lvmeng', name: '吕蒙', originalName: 'Scorpion', tier: 5, baseAtk: 1, baseHp: 1, trigger: 'summoned', abilityDesc: '【被召唤时】白衣渡江：获得淬毒锦囊（一击必杀）' },
  { id: 'zhugejin', name: '诸葛瑾', originalName: 'Seal', tier: 5, baseAtk: 3, baseHp: 8, trigger: 'eatsFood', abilityDesc: '【使用道具时】斡旋：2个随机友方 +1/+1' },
  { id: 'caocao', name: '曹操', originalName: 'Shark', tier: 5, baseAtk: 4, baseHp: 2, trigger: 'faint', abilityDesc: '【友方阵亡时】奸雄：+1/+2（商店阶段翻倍）' },
  { id: 'sunquan', name: '孙权', originalName: 'Turkey', tier: 5, baseAtk: 3, baseHp: 4, trigger: 'friendSummoned', abilityDesc: '【友方召唤时】知人善任：召唤的友方 +3/+3' },

  // ===== TIER 6 - 传奇 =====
  { id: 'lvbu', name: '吕布', originalName: 'Boar', tier: 6, baseAtk: 10, baseHp: 6, trigger: 'beforeAttack', abilityDesc: '【攻击前】无双：+4/+2' },
  { id: 'guojia', name: '郭嘉', originalName: 'Cat', tier: 6, baseAtk: 4, baseHp: 5, trigger: 'none', abilityDesc: '【被动】十胜十败：道具效果翻倍' },
  { id: 'zhugeliang', name: '诸葛亮', originalName: 'Dragon', tier: 6, baseAtk: 6, baseHp: 8, trigger: 'friendEatsFood', abilityDesc: '【友方使用道具时】锦囊妙计：所有友方 +1/+1（每回合3次）' },
  { id: 'yujin', name: '于禁', originalName: 'Fly', tier: 6, baseAtk: 5, baseHp: 5, trigger: 'faint', abilityDesc: '【友方阵亡时】收编残兵：在其位置召唤4/4残兵（每场3次）' },
  { id: 'zhangliao_hw', name: '张辽(虎威)', originalName: 'Gorilla', tier: 6, baseAtk: 6, baseHp: 9, trigger: 'hurt', abilityDesc: '【受伤时】虎威将军：获得金盾锦囊（挡1次伤害）' },
  { id: 'zhaoyun_sw', name: '赵云(神威)', originalName: 'Leopard', tier: 6, baseAtk: 10, baseHp: 4, trigger: 'startOfBattle', abilityDesc: '【战斗开始】七进七出：对随机敌人造成50% ATK伤害' },
  { id: 'guanyu_ws', name: '关羽(武圣)', originalName: 'Mammoth', tier: 6, baseAtk: 3, baseHp: 10, trigger: 'faint', abilityDesc: '【阵亡时】武圣之魂：所有友方 +2/+2' },
  { id: 'luxun', name: '陆逊', originalName: 'Snake', tier: 6, baseAtk: 6, baseHp: 6, trigger: 'friendAheadAttacks', abilityDesc: '【前方友方攻击时】火烧连营：对随机敌人造成5伤害' },
  { id: 'jiangwei', name: '姜维', originalName: 'Tiger', tier: 6, baseAtk: 4, baseHp: 3, trigger: 'friendAheadAttacks', abilityDesc: '【前方友方触发技能时】继承遗志：重复该技能（以姜维等级）' },
];
