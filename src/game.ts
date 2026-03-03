import { v4 as uuidv4 } from 'uuid';
import type { Direction, GameState, Position, LeaderboardEntry } from './types';

const BOARD_WIDTH = 20;
const BOARD_HEIGHT = 20;
const MOVE_COST = 0.001; // USDC per move

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

export function moveSnake(gameId: string, direction: Direction): GameState | null {
  const game = games.get(gameId);
  if (!game || game.gameOver) {
    return null;
  }
  
  // Prevent 180-degree turns (only if snake has more than 1 segment)
  if (game.snake.length > 1 && isOppositeDirection(game.direction, direction)) {
    direction = game.direction; // Keep current direction
  }
  
  game.direction = direction;
  
  // Calculate new head position
  const head = game.snake[0];
  let newHead: Position;
  
  switch (direction) {
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
  
  // Update move count and spending
  game.moveCount++;
  const spent = parseFloat(game.totalSpent) + MOVE_COST;
  game.totalSpent = spent.toFixed(6);
  game.updatedAt = Date.now();
  
  return game;
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
    score: game.score,
    moveCount: game.moveCount,
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
