import type { CityConfig } from '../types/map.js';

/**
 * 三国搜打撤地图：10城不规则网状拓扑
 *
 * 布局示意：
 *
 *            [邺城]
 *           /     \
 *       [洛阳]---[许昌:出生]
 *       /    \       |
 *   [长安]  [宛城]--[汝南]
 *      |    /    \      \
 *   [天水]-+   [襄阳]  [庐江]
 *       \         |   /
 *      [汉中]--[江陵]
 *          \   /
 *       [成都:撤离]
 */
export const MAP_CITIES: CityConfig[] = [
  {
    id: 'yecheng',
    name: '邺城',
    connections: ['luoyang', 'xuchang'],
    dangerLevel: 3,
    maxResources: 13,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 500, y: 50 },
  },
  {
    id: 'luoyang',
    name: '洛阳',
    connections: ['yecheng', 'xuchang', 'changan', 'wancheng'],
    dangerLevel: 3,
    maxResources: 15,
    hasBlackMarket: true,
    isEvacPoint: false,
    position: { x: 320, y: 150 },
  },
  {
    id: 'xuchang',
    name: '许昌',
    connections: ['yecheng', 'luoyang', 'runan'],
    dangerLevel: 2,
    maxResources: 10,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 680, y: 150 },
  },
  {
    id: 'changan',
    name: '长安',
    connections: ['luoyang', 'tianshui'],
    dangerLevel: 4,
    maxResources: 17,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 120, y: 280 },
  },
  {
    id: 'wancheng',
    name: '宛城',
    connections: ['luoyang', 'runan', 'tianshui', 'xiangyang'],
    dangerLevel: 3,
    maxResources: 12,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 420, y: 300 },
  },
  {
    id: 'runan',
    name: '汝南',
    connections: ['xuchang', 'wancheng', 'lujiang'],
    dangerLevel: 1,
    maxResources: 7,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 700, y: 300 },
  },
  {
    id: 'tianshui',
    name: '天水',
    connections: ['changan', 'wancheng', 'hanzhong'],
    dangerLevel: 4,
    maxResources: 13,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 180, y: 420 },
  },
  {
    id: 'xiangyang',
    name: '襄阳',
    connections: ['wancheng', 'jiangling'],
    dangerLevel: 3,
    maxResources: 12,
    hasBlackMarket: true,
    isEvacPoint: false,
    position: { x: 520, y: 430 },
  },
  {
    id: 'lujiang',
    name: '庐江',
    connections: ['runan', 'jiangling'],
    dangerLevel: 2,
    maxResources: 8,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 760, y: 430 },
  },
  {
    id: 'jiangling',
    name: '江陵',
    connections: ['xiangyang', 'lujiang', 'hanzhong', 'chengdu'],
    dangerLevel: 4,
    maxResources: 15,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 600, y: 530 },
  },
  {
    id: 'hanzhong',
    name: '汉中',
    connections: ['tianshui', 'jiangling', 'chengdu'],
    dangerLevel: 5,
    maxResources: 17,
    hasBlackMarket: false,
    isEvacPoint: false,
    position: { x: 320, y: 530 },
  },
  {
    id: 'chengdu',
    name: '成都',
    connections: ['hanzhong', 'jiangling'],
    dangerLevel: 5,
    maxResources: 20,
    hasBlackMarket: false,
    isEvacPoint: true,
    position: { x: 460, y: 650 },
  },
];

/** 按ID快速查找 */
export const CITY_MAP = new Map(MAP_CITIES.map(c => [c.id, c]));

/** 默认出生城池ID */
export const SPAWN_CITY_ID = 'xuchang';

/** 移动到相邻城池的基础耗时（秒） */
export const BASE_MOVE_DURATION = 5;

/** 搜索间隔（秒） */
export const SEARCH_INTERVAL = 2;
