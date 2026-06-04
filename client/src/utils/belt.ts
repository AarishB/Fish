export type BeltName = 'White' | 'Yellow' | 'Orange' | 'Green' | 'Blue' | 'Purple' | 'Brown' | 'Black';

export interface Belt {
  name: BeltName;
  color: string;
  textColor: string;
  min: number;
  max: number | null;
}

export const BELTS: Belt[] = [
  { name: 'White',  color: '#e5e7eb', textColor: '#1f2937', min: 0,   max: 10  },
  { name: 'Yellow', color: '#fbbf24', textColor: '#1f2937', min: 11,  max: 30  },
  { name: 'Orange', color: '#f97316', textColor: '#fff',    min: 31,  max: 60  },
  { name: 'Green',  color: '#22c55e', textColor: '#fff',    min: 61,  max: 100 },
  { name: 'Blue',   color: '#3b82f6', textColor: '#fff',    min: 101, max: 150 },
  { name: 'Purple', color: '#a855f7', textColor: '#fff',    min: 151, max: 200 },
  { name: 'Brown',  color: '#92400e', textColor: '#fff',    min: 201, max: 300 },
  { name: 'Black',  color: '#111827', textColor: '#fff',    min: 301, max: null },
];

export function getBelt(gamesPlayed: number): Belt {
  return BELTS.find(b => b.max === null || gamesPlayed <= b.max) ?? BELTS[BELTS.length - 1];
}
