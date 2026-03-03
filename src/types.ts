import { z } from 'zod';

export const DirectionSchema = z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT']);
export type Direction = z.infer<typeof DirectionSchema>;

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  gameId: string;
  board: { width: number; height: number };
  snake: Position[];
  food: Position;
  direction: Direction;
  score: number;
  moveCount: number;
  directionChanges: number;
  totalSpent: string;
  gameOver: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  gameId: string;
  score: number;
  moveCount: number;
  totalSpent: string;
  completedAt: number;
}

export const MoveInputSchema = z.object({
  direction: DirectionSchema,
});

export const NewGameResponseSchema = z.object({
  gameId: z.string(),
  state: z.literal('playing'),
  board: z.object({ width: z.number(), height: z.number() }),
  snake: z.array(z.object({ x: z.number(), y: z.number() })),
  food: z.object({ x: z.number(), y: z.number() }),
  score: z.number(),
  moveCount: z.number(),
  totalSpent: z.string(),
  gameOver: z.boolean(),
});

export const MoveResponseSchema = z.object({
  gameId: z.string(),
  state: z.enum(['playing', 'game_over']),
  board: z.object({ width: z.number(), height: z.number() }),
  snake: z.array(z.object({ x: z.number(), y: z.number() })),
  food: z.object({ x: z.number(), y: z.number() }),
  score: z.number(),
  moveCount: z.number(),
  totalSpent: z.string(),
  gameOver: z.boolean(),
});
