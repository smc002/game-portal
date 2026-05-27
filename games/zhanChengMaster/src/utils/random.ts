export type WeightedItem<T> = {
  item: T;
  weight: number;
};

export function weightedPick<T>(items: WeightedItem<T>[]): T {
  const total = items.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of items) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.item;
    }
  }
  return items[items.length - 1].item;
}

export function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
