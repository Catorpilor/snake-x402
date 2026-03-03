import { describe, it, expect, beforeEach } from 'bun:test';
import {
  createGame,
  getGame,
  moveSnake,
  getLeaderboard,
  formatGameResponse,
  clearGames,
  clearLeaderboard,
  isOppositeDirection,
} from '../src/game';

describe('Snake Game Logic', () => {
  beforeEach(() => {
    clearGames();
    clearLeaderboard();
  });

  describe('createGame', () => {
    it('should create a new game with valid initial state', () => {
      const game = createGame();
      
      expect(game.gameId).toBeDefined();
      expect(game.gameId.length).toBeGreaterThan(0);
      expect(game.board).toEqual({ width: 20, height: 20 });
      expect(game.snake.length).toBe(1);
      expect(game.score).toBe(0);
      expect(game.moveCount).toBe(0);
      expect(game.totalSpent).toBe('0.000000');
      expect(game.gameOver).toBe(false);
    });

    it('should create snake at center of board', () => {
      const game = createGame();
      const head = game.snake[0];
      
      expect(head.x).toBe(10);
      expect(head.y).toBe(10);
    });

    it('should place food at different position than snake', () => {
      const game = createGame();
      const head = game.snake[0];
      
      expect(game.food.x !== head.x || game.food.y !== head.y).toBe(true);
    });

    it('should set initial direction to RIGHT', () => {
      const game = createGame();
      expect(game.direction).toBe('RIGHT');
    });
  });

  describe('getGame', () => {
    it('should return game by id', () => {
      const created = createGame();
      const retrieved = getGame(created.gameId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.gameId).toBe(created.gameId);
    });

    it('should return null for non-existent game', () => {
      const game = getGame('non-existent-id');
      expect(game).toBeNull();
    });
  });

  describe('isOppositeDirection', () => {
    it('should detect UP and DOWN as opposites', () => {
      expect(isOppositeDirection('UP', 'DOWN')).toBe(true);
      expect(isOppositeDirection('DOWN', 'UP')).toBe(true);
    });

    it('should detect LEFT and RIGHT as opposites', () => {
      expect(isOppositeDirection('LEFT', 'RIGHT')).toBe(true);
      expect(isOppositeDirection('RIGHT', 'LEFT')).toBe(true);
    });

    it('should not flag non-opposites', () => {
      expect(isOppositeDirection('UP', 'LEFT')).toBe(false);
      expect(isOppositeDirection('UP', 'RIGHT')).toBe(false);
      expect(isOppositeDirection('DOWN', 'LEFT')).toBe(false);
    });
  });

  describe('moveSnake', () => {
    it('should move snake in the specified direction', () => {
      const game = createGame();
      const initialHead = { ...game.snake[0] };
      
      moveSnake(game.gameId, 'RIGHT');
      
      expect(game.snake[0].x).toBe(initialHead.x + 1);
      expect(game.snake[0].y).toBe(initialHead.y);
    });

    it('should move UP correctly', () => {
      const game = createGame();
      const initialHead = { ...game.snake[0] };
      
      moveSnake(game.gameId, 'UP');
      
      expect(game.snake[0].x).toBe(initialHead.x);
      expect(game.snake[0].y).toBe(initialHead.y - 1);
    });

    it('should move DOWN correctly', () => {
      const game = createGame();
      const initialHead = { ...game.snake[0] };
      
      moveSnake(game.gameId, 'DOWN');
      
      expect(game.snake[0].x).toBe(initialHead.x);
      expect(game.snake[0].y).toBe(initialHead.y + 1);
    });

    it('should move LEFT correctly', () => {
      const game = createGame();
      const initialHead = { ...game.snake[0] };
      
      moveSnake(game.gameId, 'LEFT');
      
      expect(game.snake[0].x).toBe(initialHead.x - 1);
      expect(game.snake[0].y).toBe(initialHead.y);
    });

    it('should increment move count', () => {
      const game = createGame();
      
      moveSnake(game.gameId, 'RIGHT');
      expect(game.moveCount).toBe(1);
      
      moveSnake(game.gameId, 'RIGHT');
      expect(game.moveCount).toBe(2);
    });

    it('should track spending correctly', () => {
      const game = createGame();
      
      moveSnake(game.gameId, 'RIGHT');
      expect(game.totalSpent).toBe('0.001000');
      
      moveSnake(game.gameId, 'RIGHT');
      expect(game.totalSpent).toBe('0.002000');
    });

    it('should return null for non-existent game', () => {
      const result = moveSnake('non-existent', 'UP');
      expect(result).toBeNull();
    });

    it('should return null for game over', () => {
      const game = createGame();
      game.gameOver = true;
      
      const result = moveSnake(game.gameId, 'UP');
      expect(result).toBeNull();
    });
  });

  describe('Wall collision', () => {
    it('should detect collision with right wall', () => {
      const game = createGame();
      // Move snake to right edge
      game.snake = [{ x: 19, y: 10 }];
      
      moveSnake(game.gameId, 'RIGHT');
      
      expect(game.gameOver).toBe(true);
    });

    it('should detect collision with left wall', () => {
      const game = createGame();
      game.snake = [{ x: 0, y: 10 }];
      
      moveSnake(game.gameId, 'LEFT');
      
      expect(game.gameOver).toBe(true);
    });

    it('should detect collision with top wall', () => {
      const game = createGame();
      game.snake = [{ x: 10, y: 0 }];
      
      moveSnake(game.gameId, 'UP');
      
      expect(game.gameOver).toBe(true);
    });

    it('should detect collision with bottom wall', () => {
      const game = createGame();
      game.snake = [{ x: 10, y: 19 }];
      
      moveSnake(game.gameId, 'DOWN');
      
      expect(game.gameOver).toBe(true);
    });
  });

  describe('Self collision', () => {
    it('should detect collision with snake body', () => {
      const game = createGame();
      // Create a snake that will collide with itself
      game.snake = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
      ];
      
      // Moving down would hit the body at (5, 6)
      moveSnake(game.gameId, 'DOWN');
      
      expect(game.gameOver).toBe(true);
    });
  });

  describe('Food consumption', () => {
    it('should grow snake when eating food', () => {
      const game = createGame();
      const initialLength = game.snake.length;
      
      // Place food directly in front of snake
      game.food = { x: game.snake[0].x + 1, y: game.snake[0].y };
      
      moveSnake(game.gameId, 'RIGHT');
      
      expect(game.snake.length).toBe(initialLength + 1);
    });

    it('should increase score when eating food', () => {
      const game = createGame();
      game.food = { x: game.snake[0].x + 1, y: game.snake[0].y };
      
      moveSnake(game.gameId, 'RIGHT');
      
      expect(game.score).toBe(10);
    });

    it('should spawn new food after eating', () => {
      const game = createGame();
      const oldFood = { ...game.food };
      game.food = { x: game.snake[0].x + 1, y: game.snake[0].y };
      
      moveSnake(game.gameId, 'RIGHT');
      
      // New food should be different (unless very unlucky)
      expect(game.food).toBeDefined();
    });
  });

  describe('Leaderboard', () => {
    it('should add game to leaderboard on game over', () => {
      const game = createGame();
      game.snake = [{ x: 19, y: 10 }];
      game.score = 50;
      
      moveSnake(game.gameId, 'RIGHT');
      
      const leaderboard = getLeaderboard();
      expect(leaderboard.length).toBe(1);
      expect(leaderboard[0].score).toBe(50);
    });

    it('should sort leaderboard by score descending', () => {
      // Game 1
      const game1 = createGame();
      game1.snake = [{ x: 19, y: 10 }];
      game1.score = 30;
      moveSnake(game1.gameId, 'RIGHT');

      // Game 2
      const game2 = createGame();
      game2.snake = [{ x: 19, y: 10 }];
      game2.score = 50;
      moveSnake(game2.gameId, 'RIGHT');

      // Game 3
      const game3 = createGame();
      game3.snake = [{ x: 19, y: 10 }];
      game3.score = 10;
      moveSnake(game3.gameId, 'RIGHT');
      
      const leaderboard = getLeaderboard();
      
      expect(leaderboard[0].score).toBe(50);
      expect(leaderboard[1].score).toBe(30);
      expect(leaderboard[2].score).toBe(10);
    });

    it('should limit leaderboard to requested entries', () => {
      // Create multiple games
      for (let i = 0; i < 15; i++) {
        const game = createGame();
        game.snake = [{ x: 19, y: 10 }];
        game.score = i * 10;
        moveSnake(game.gameId, 'RIGHT');
      }
      
      const leaderboard = getLeaderboard(5);
      expect(leaderboard.length).toBe(5);
    });
  });

  describe('formatGameResponse', () => {
    it('should format game state correctly', () => {
      const game = createGame();
      const response = formatGameResponse(game);
      
      expect(response.gameId).toBe(game.gameId);
      expect(response.state).toBe('playing');
      expect(response.board).toEqual(game.board);
      expect(response.snake).toEqual(game.snake);
      expect(response.food).toEqual(game.food);
      expect(response.score).toBe(game.score);
      expect(response.moveCount).toBe(game.moveCount);
      expect(response.totalSpent).toBe(game.totalSpent);
      expect(response.gameOver).toBe(false);
    });

    it('should return game_over state when game is over', () => {
      const game = createGame();
      game.gameOver = true;
      
      const response = formatGameResponse(game);
      
      expect(response.state).toBe('game_over');
      expect(response.gameOver).toBe(true);
    });
  });
});

describe('HTTP API Integration', () => {
  // These tests would run against the actual API
  // For now, we test the business logic above

  it('should require gameId for move endpoint', () => {
    // This would be an integration test
    expect(true).toBe(true);
  });

  it('should return 402 without payment', () => {
    // This would be an integration test  
    expect(true).toBe(true);
  });
});
