import { config } from 'dotenv';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { ExactEvmScheme } from '@x402/evm';
import { HTTPFacilitatorClient } from '@x402/core/server';
import {
  createGame,
  getGame,
  moveSnake,
  getLeaderboard,
  formatGameResponse,
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
  allowHeaders: ['Content-Type', 'Authorization', 'X-Payment-Response', 'X-PAYMENT'],
  exposeHeaders: ['X-Payment-Response', 'WWW-Authenticate'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create new game (free)
app.post('/v1/game/new', (c) => {
  const game = createGame();
  return c.json(formatGameResponse(game));
});

// Get game state (free)
app.get('/v1/game/:id', (c) => {
  const gameId = c.req.param('id');
  const game = getGame(gameId);
  
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }
  
  return c.json(formatGameResponse(game));
});

// Get leaderboard (free)
app.get('/v1/leaderboard', (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const entries = getLeaderboard(Math.min(limit, 100));
  return c.json({ leaderboard: entries });
});

// Payment-protected move endpoint
const moveApp = new Hono();

// Setup x402 payment middleware for move endpoint
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

const moveRoutes = {
  'POST /': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.001',
        network: NETWORK,
        payTo: PAYMENT_ADDRESS,
      },
    ],
    description: 'Make a move in Snake game',
    mimeType: 'application/json',
  },
};

moveApp.use(paymentMiddleware(moveRoutes, resourceServer));

moveApp.post('/', async (c) => {
  const gameId = c.req.query('gameId');
  
  if (!gameId) {
    return c.json({ error: 'gameId query parameter required' }, 400);
  }
  
  const body = await c.req.json();
  const result = DirectionSchema.safeParse(body.direction);
  
  if (!result.success) {
    return c.json({ error: 'Invalid direction. Must be UP, DOWN, LEFT, or RIGHT' }, 400);
  }
  
  const game = moveSnake(gameId, result.data);
  
  if (!game) {
    return c.json({ error: 'Game not found or already over' }, 404);
  }
  
  return c.json({
    ...formatGameResponse(game),
    paymentVerified: true,
  });
});

// Mount move endpoint
app.route('/v1/game/move', moveApp);

// Handle /v1/game/:id/move - redirect to payment endpoint
app.post('/v1/game/:id/move', async (c) => {
  const gameId = c.req.param('id');
  return c.json({
    error: 'Use POST /v1/game/move?gameId=' + gameId + ' with x402 payment',
    hint: 'This endpoint requires x402 payment of $0.001 USDC',
    paymentEndpoint: '/v1/game/move?gameId=' + gameId,
  }, 402);
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
