import { v4 as uuidv4 } from 'uuid';
import type { Direction, GameState, Position, LeaderboardEntry } from './types';

const BOARD_WIDTH = 20;
const BOARD_HEIGHT = 20;
const DIRECTION_CHANGE_COST = 0.001; // USDC per direction change

// In-memory storage
const games: Map<string, GameState> = new Map();
const leaderboard: LeaderboardEntry[] = [];

function randomPosition(excludePositions: Position[] = []): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_WIDTH),
      y: Math.floor(Math.random() * BOARD_HEIGHT),
    };
  } while (excludePositions.some(p => p.x === pos.x && p.y === pos.y));
  return pos;
}

export function createGame(): GameState {
  const gameId = uuidv4();
  const initialSnake: Position[] = [
    { x: Math.floor(BOARD_WIDTH / 2), y: Math.floor(BOARD_HEIGHT / 2) },
  ];
  
  const game: GameState = {
    gameId,
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    snake: initialSnake,
    food: randomPosition(initialSnake),
    direction: 'RIGHT',
    score: 0,
    moveCount: 0,
    directionChanges: 0,
    totalSpent: '0.000000',
    gameOver: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  games.set(gameId, game);
  return game;
}

export function getGame(gameId: string): GameState | null {
  return games.get(gameId) || null;
}

export function isOppositeDirection(current: Direction, next: Direction): boolean {
  const opposites: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
  };
  return opposites[current] === next;
}

/**
 * Check if a direction change is valid and needed
 * Returns true if direction is different and not opposite
 */
export function isValidDirectionChange(game: GameState, newDirection: Direction): boolean {
  // Same direction = no change needed
  if (game.direction === newDirection) {
    return false;
  }
  
  // Can't do 180-degree turn if snake has multiple segments
  if (game.snake.length > 1 && isOppositeDirection(game.direction, newDirection)) {
    return false;
  }
  
  return true;
}

/**
 * Change direction (PAID) - only changes direction, doesn't move
 */
export function changeDirection(gameId: string, newDirection: Direction): { game: GameState | null; changed: boolean } {
  const game = games.get(gameId);
  if (!game || game.gameOver) {
    return { game: null, changed: false };
  }
  
  // Check if this is a valid direction change
  if (!isValidDirectionChange(game, newDirection)) {
    return { game, changed: false };
  }
  
  // Change direction
  game.direction = newDirection;
  game.directionChanges++;
  
  // Update spending for direction change
  const spent = parseFloat(game.totalSpent) + DIRECTION_CHANGE_COST;
  game.totalSpent = spent.toFixed(6);
  game.updatedAt = Date.now();
  
  return { game, changed: true };
}

/**
 * Tick/move snake forward (FREE) - moves in current direction
 */
export function tickGame(gameId: string): GameState | null {
  const game = games.get(gameId);
  if (!game || game.gameOver) {
    return game || null;
  }
  
  // Calculate new head position based on current direction
  const head = game.snake[0];
  let newHead: Position;
  
  switch (game.direction) {
    case 'UP':
      newHead = { x: head.x, y: head.y - 1 };
      break;
    case 'DOWN':
      newHead = { x: head.x, y: head.y + 1 };
      break;
    case 'LEFT':
      newHead = { x: head.x - 1, y: head.y };
      break;
    case 'RIGHT':
      newHead = { x: head.x + 1, y: head.y };
      break;
  }
  
  // Check wall collision
  if (
    newHead.x < 0 ||
    newHead.x >= BOARD_WIDTH ||
    newHead.y < 0 ||
    newHead.y >= BOARD_HEIGHT
  ) {
    game.gameOver = true;
    game.updatedAt = Date.now();
    addToLeaderboard(game);
    return game;
  }
  
  // Check self collision (exclude tail since it will move)
  const bodyWithoutTail = game.snake.slice(0, -1);
  if (bodyWithoutTail.some(p => p.x === newHead.x && p.y === newHead.y)) {
    game.gameOver = true;
    game.updatedAt = Date.now();
    addToLeaderboard(game);
    return game;
  }
  
  // Move snake
  game.snake.unshift(newHead);
  
  // Check food collision
  if (newHead.x === game.food.x && newHead.y === game.food.y) {
    // Grow snake (don't remove tail)
    game.score += 10;
    game.food = randomPosition(game.snake);
  } else {
    // Remove tail
    game.snake.pop();
  }
  
  game.moveCount++;
  game.updatedAt = Date.now();
  
  return game;
}

// Legacy function for backward compatibility
export function moveSnake(gameId: string, direction: Direction): GameState | null {
  const game = games.get(gameId);
  if (!game || game.gameOver) {
    return null;
  }
  
  // Change direction if different
  if (isValidDirectionChange(game, direction)) {
    game.direction = direction;
    game.directionChanges++;
    const spent = parseFloat(game.totalSpent) + DIRECTION_CHANGE_COST;
    game.totalSpent = spent.toFixed(6);
  }
  
  // Then tick
  return tickGame(gameId);
}

function addToLeaderboard(game: GameState): void {
  leaderboard.push({
    gameId: game.gameId,
    score: game.score,
    moveCount: game.moveCount,
    totalSpent: game.totalSpent,
    completedAt: Date.now(),
  });
  
  // Sort by score descending, keep top 100
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 100) {
    leaderboard.length = 100;
  }
}

export function getLeaderboard(limit: number = 10): LeaderboardEntry[] {
  return leaderboard.slice(0, limit);
}

export function formatGameResponse(game: GameState) {
  return {
    gameId: game.gameId,
    state: game.gameOver ? 'game_over' : 'playing',
    board: game.board,
    snake: game.snake,
    food: game.food,
    direction: game.direction,
    score: game.score,
    moveCount: game.moveCount,
    directionChanges: game.directionChanges,
    totalSpent: game.totalSpent,
    gameOver: game.gameOver,
  };
}

// For testing
export function clearGames(): void {
  games.clear();
}

export function clearLeaderboard(): void {
  leaderboard.length = 0;
}
