export type Owner = 'player' | 'enemy';

export type Quality = 'green' | 'blue' | 'purple' | 'orange';

export type TileKind =
  | 'question'
  | 'campLow'
  | 'campMid'
  | 'campHigh'
  | 'mine'
  | 'tower'
  | 'empty'
  | 'base';

export type BuildingKind = 'base' | 'mine' | 'tower' | 'barrack';

export type GameStatus = 'playing' | 'playerWin' | 'enemyWin';

export type HexCoord = {
  q: number;
  r: number;
};

export type BarrackCard = {
  id: string;
  name: string;
  quality: Quality;
  unitId: string;
  spawnMs: number;
};

export type UnitConfig = {
  id: string;
  name: string;
  icon: string;
  hp: number;
  damage: number;
  attackMs: number;
  moveSpeed: number;
  range: number;
  speedLabel: string;
};

export type TileTemplate = {
  coord: HexCoord;
  kind: Exclude<TileKind, 'empty'>;
};

export type Tile = {
  id: string;
  coord: HexCoord;
  kind: TileKind;
  originalKind: TileKind;
  tint: Owner;
  occupiedBy?: Owner;
  revealedFor: Owner[];
  cost?: number;
  buildingId?: string;
};

export type Building = {
  id: string;
  tileId: string;
  owner: Owner;
  kind: BuildingKind;
  hp: number;
  maxHp: number;
  cardId?: string;
  goldElapsedMs: number;
  spawnElapsedMs: number;
  spawnMs?: number;
  attackElapsedMs: number;
  attackTargetId?: string;
};

export type Unit = {
  id: string;
  owner: Owner;
  unitId: string;
  tileId: string;
  fromTileId: string;
  toTileId?: string;
  moveProgress: number;
  hp: number;
  maxHp: number;
  attackElapsedMs: number;
  attackTargetId?: string;
};

export type ProjectileTarget =
  | { kind: 'unit'; id: string }
  | { kind: 'building'; id: string };

export type Projectile = {
  id: string;
  owner: Owner;
  sourceTileId: string;
  target: ProjectileTarget;
  targetTileId: string;
  damage: number;
  progress: number;
  speed: number;
  style: 'arrow' | 'bolt' | 'magic';
};

export type FloatingText = {
  id: string;
  text: string;
  tileId?: string;
  owner?: Owner;
  ageMs: number;
};

export type PlayerState = {
  gold: number;
};

export type GameState = {
  tiles: Record<string, Tile>;
  buildings: Record<string, Building>;
  units: Record<string, Unit>;
  projectiles: Record<string, Projectile>;
  players: Record<Owner, PlayerState>;
  decks: Record<Owner, BarrackCard[]>;
  logs: string[];
  floatingTexts: FloatingText[];
  status: GameStatus;
  elapsedMs: number;
  economyElapsedMs: number;
  aiElapsedMs: number;
  nextId: number;
};
