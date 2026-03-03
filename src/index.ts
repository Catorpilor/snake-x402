import { config } from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { paymentMiddlewareFromConfig } from '@x402/hono';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import {
  createGame,
  getGame,
  tickGame,
  changeDirection,
  getLeaderboard,
  formatGameResponse,
  isValidDirectionChange,
} from './game';
import { DirectionSchema } from './types';

config();

const PORT = parseInt(process.env.PORT || '3000');
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS as `0x${string}`;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facilitator.daydreams.systems';
const NETWORK = process.env.NETWORK || 'eip155:8453'; // Base Mainnet

if (!PAYMENT_ADDRESS) {
  console.error('❌ PAYMENT_ADDRESS environment variable is required');
  process.exit(1);
}

const app = new Hono();

// CORS for frontend
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Payment-Response', 'X-PAYMENT', 'PAYMENT-SIGNATURE'],
  exposeHeaders: ['X-Payment-Response', 'WWW-Authenticate', 'PAYMENT-REQUIRED', 'PAYMENT-RESPONSE'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create new game (FREE)
app.post('/v1/game/new', (c) => {
  const game = createGame();
  return c.json(formatGameResponse(game));
});

// Get game state (FREE)
app.get('/v1/game/:id', (c) => {
  const gameId = c.req.param('id');
  const game = getGame(gameId);
  
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }
  
  return c.json(formatGameResponse(game));
});

// Tick/auto-move (FREE) - moves snake in current direction
app.post('/v1/game/tick', (c) => {
  const gameId = c.req.query('gameId');
  
  if (!gameId) {
    return c.json({ error: 'gameId query parameter required' }, 400);
  }
  
  const game = tickGame(gameId);
  
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }
  
  return c.json(formatGameResponse(game));
});

// Check if direction change is needed (FREE) - for client to know if payment is required
app.get('/v1/game/check-turn', (c) => {
  const gameId = c.req.query('gameId');
  const direction = c.req.query('direction');
  
  if (!gameId || !direction) {
    return c.json({ error: 'gameId and direction query parameters required' }, 400);
  }
  
  const result = DirectionSchema.safeParse(direction);
  if (!result.success) {
    return c.json({ error: 'Invalid direction' }, 400);
  }
  
  const game = getGame(gameId);
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }
  
  const needsPayment = isValidDirectionChange(game, result.data);
  
  return c.json({
    currentDirection: game.direction,
    requestedDirection: result.data,
    needsPayment,
    reason: needsPayment ? 'Direction change requires payment' : 'Same direction or invalid turn',
  });
});

// Get leaderboard (FREE)
app.get('/v1/leaderboard', (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const entries = getLeaderboard(Math.min(limit, 100));
  return c.json({ leaderboard: entries });
});

// Setup x402 payment middleware for turn endpoint
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

const turnRoutes = {
  'POST /v1/game/turn': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.001',
        network: NETWORK,
        payTo: PAYMENT_ADDRESS,
      },
    ],
    description: 'Change direction in Snake game (costs $0.001 USDC)',
    mimeType: 'application/json',
  },
};

const evmScheme = new ExactEvmScheme();
app.use(paymentMiddlewareFromConfig(
  turnRoutes, 
  facilitatorClient,
  [{ network: NETWORK, server: evmScheme }]
));

// Turn/change direction (PAID) - only changes direction
app.post('/v1/game/turn', async (c) => {
  const gameId = c.req.query('gameId');
  
  if (!gameId) {
    return c.json({ error: 'gameId query parameter required' }, 400);
  }
  
  const body = await c.req.json();
  const result = DirectionSchema.safeParse(body.direction);
  
  if (!result.success) {
    return c.json({ error: 'Invalid direction. Must be UP, DOWN, LEFT, or RIGHT' }, 400);
  }
  
  const { game, changed } = changeDirection(gameId, result.data);
  
  if (!game) {
    return c.json({ error: 'Game not found or already over' }, 404);
  }
  
  return c.json({
    ...formatGameResponse(game),
    directionChanged: changed,
    paymentVerified: true,
  });
});

// Serve static frontend
app.get('/', async (c) => {
  const fs = await import('fs');
  const path = await import('path');
  const frontendPath = path.join(process.cwd(), 'frontend', 'index.html');
  
  try {
    const html = fs.readFileSync(frontendPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Snake x402</title></head>
      <body>
        <h1>🐍 Snake x402</h1>
        <p>Frontend not found. API is available at /v1/</p>
      </body>
      </html>
    `);
  }
});

console.log(`🐍 Snake x402 server running at http://localhost:${PORT}`);
console.log(`💰 Payment address: ${PAYMENT_ADDRESS}`);
console.log(`🔗 Network: ${NETWORK}`);
console.log(`📡 Facilitator: ${FACILITATOR_URL}`);

// Export for Bun.serve() auto-start
export default {
  port: PORT,
  fetch: app.fetch,
};
