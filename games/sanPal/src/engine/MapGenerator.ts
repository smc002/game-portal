import type { MapNode, NodeType, NodeData } from '../data/types';
import { getGeneralsByStars } from '../data/generals';

import { shuffle, pick, randomInt } from './helpers';

interface ActConfig {
  act: number;
  layers: number;
  wildStars: number[];
  bossId: string;
  bossEscorts: string[];
  earlyEasyLayers: number; // first N middle layers forced to easy wild
}

const ACT_CONFIGS: ActConfig[] = [
  { act: 1, layers: 8, wildStars: [1, 2], bossId: 'zhang_jiao', bossEscorts: [], earlyEasyLayers: 5 },
  { act: 2, layers: 5, wildStars: [2, 3], bossId: 'dong_zhuo', bossEscorts: ['lv_bu'], earlyEasyLayers: 0 },
  { act: 3, layers: 5, wildStars: [3, 4], bossId: 'lv_bu', bossEscorts: [], earlyEasyLayers: 0 },
];

export function generateMap(act: number): MapNode[] {
  const config = ACT_CONFIGS[act - 1]!;
  const nodes: MapNode[] = [];
  const layerNodes: string[][] = [];

  // Layer 0: spawn point (safe, no battle)
  const startId = 'start';
  nodes.push({
    id: startId, type: 'spawn', layer: 0,
    connections: [], visited: true,
    data: { type: 'spawn' } as NodeData,
  });
  layerNodes.push([startId]);

  // Middle layers
  const middleCount = config.layers - 2;
  const middleTypes: NodeType[][] = generateLayerTypes(middleCount, config.earlyEasyLayers);

  for (let layer = 1; layer <= middleCount; layer++) {
    const types = middleTypes[layer - 1]!;
    const ids: string[] = [];

    for (let i = 0; i < types.length; i++) {
      const id = `L${layer}_${i}`;
      const type = types[i]!;
      const isEasyLayer = layer <= config.earlyEasyLayers;
      const nodeData = isEasyLayer
        ? generateEasyWildData()
        : generateNodeData(type, config.wildStars);
      nodes.push({
        id, type: isEasyLayer ? 'wild' : type, layer, connections: [], visited: false,
        data: nodeData,
      });
      ids.push(id);
    }
    layerNodes.push(ids);
  }

  // Boss layer
  const bossId = 'boss';
  nodes.push({
    id: bossId, type: 'boss', layer: config.layers - 1,
    connections: [], visited: false,
    data: { type: 'boss', generalId: config.bossId, escorts: config.bossEscorts },
  });
  layerNodes.push([bossId]);

  // Connect layers
  for (let l = 0; l < layerNodes.length - 1; l++) {
    const current = layerNodes[l]!;
    const next = layerNodes[l + 1]!;

    // Ensure every node in current connects to at least one in next
    for (const nodeId of current) {
      const node = nodes.find((n) => n.id === nodeId)!;
      const targetIdx = randomInt(0, next.length - 1);
      node.connections.push(next[targetIdx]!);
      // Add a second connection sometimes
      if (next.length > 1 && Math.random() < 0.5) {
        const other = (targetIdx + 1) % next.length;
        if (!node.connections.includes(next[other]!)) {
          node.connections.push(next[other]!);
        }
      }
    }

    // Ensure every node in next is reachable from at least one in current
    for (const nextId of next) {
      const hasParent = current.some((cId) =>
        nodes.find((n) => n.id === cId)!.connections.includes(nextId),
      );
      if (!hasParent) {
        const parentId = pick(current);
        nodes.find((n) => n.id === parentId)!.connections.push(nextId);
      }
    }
  }

  return nodes;
}

function generateLayerTypes(count: number, _earlyEasyLayers = 0): NodeType[][] {
  // Each middle layer has 2-3 nodes
  // Early easy layers will be overridden to wild anyway, but still generate types for them
  const required: NodeType[] = ['elite', 'shop', 'rest'];
  const pool: NodeType[] = ['wild', 'wild', 'event', ...required];
  const shuffled = shuffle(pool);

  const layers: NodeType[][] = [];
  let idx = 0;
  for (let i = 0; i < count; i++) {
    const size = Math.random() < 0.5 ? 2 : 3;
    const layer: NodeType[] = [];
    for (let j = 0; j < size; j++) {
      layer.push(shuffled[idx % shuffled.length]!);
      idx++;
    }
    layers.push(layer);
  }

  // Ensure at least one shop and one rest exist somewhere
  const flat = layers.flat();
  if (!flat.includes('shop')) {
    layers[0]![0] = 'shop';
  }
  if (!flat.includes('rest')) {
    const lastMiddle = layers[layers.length - 1]!;
    lastMiddle[lastMiddle.length - 1] = 'rest';
  }

  return layers;
}

function generateEasyWildData(): NodeData {
  const pool = getGeneralsByStars(1);
  const general = pick(pool);
  return { type: 'wild', generalId: general.id, level: randomInt(1, 2) };
}

function generateWildData(stars: number[]): NodeData {
  const star = pick(stars);
  const pool = getGeneralsByStars(star);
  const general = pick(pool);
  return { type: 'wild', generalId: general.id };
}

function generateNodeData(type: NodeType, wildStars: number[]): NodeData {
  switch (type) {
    case 'wild':
      return generateWildData(wildStars);
    case 'elite': {
      const star = Math.max(...wildStars);
      const pool = getGeneralsByStars(star);
      // Elite: 2-3 enemies
      const count = 2 + (Math.random() < 0.3 ? 1 : 0);
      const ids: string[] = [];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const g = pick(shuffle(pool));
        ids.push(g.id);
      }
      return { type: 'elite', generalIds: ids };
    }
    case 'shop': {
      const shopItems = [
        { itemId: 'zhujian', price: 30 },
        { itemId: 'jinnang', price: 80 },
        { itemId: 'jinchuangyao', price: 25 },
        { itemId: 'huatuogao', price: 60 },
        { itemId: 'taipingyaoshu', price: 80 },
        { itemId: 'gu', price: 40 },
        { itemId: 'qi', price: 40 },
        { itemId: 'bingliangwan', price: 35 },
        { itemId: 'bingfashu', price: 120 },
      ];
      return { type: 'shop', items: shuffle(shopItems).slice(0, 5) };
    }
    case 'rest':
      return { type: 'rest' };
    case 'event':
      return { type: 'event', eventId: pick(['gift', 'trap', 'shrine', 'merchant']) };
    case 'boss':
      return { type: 'boss', generalId: '', escorts: [] };
    case 'spawn':
      return { type: 'spawn' };
  }
}
