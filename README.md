# 🐍 Snake x402

A playable browser Snake game where every move costs $0.001 USDC via x402 micropayments.

## Features

- Classic Snake gameplay
- x402 micropayments ($0.001 per move)
- Real-time payment verification
- In-game leaderboard
- Pure HTML/CSS/JS frontend
- TypeScript backend with Hono

## Quick Start

### Local Development

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Edit .env with your wallet address
# PAYMENT_ADDRESS=0xYourWalletAddress

# Run tests
bun test

# Start development server
bun run dev
```

### Docker Deployment

```bash
# Build and run
PAYMENT_ADDRESS=0xYourWalletAddress docker-compose up -d

# Or build manually
docker build -t snake-x402 .
docker run -p 3402:3000 -e PAYMENT_ADDRESS=0xYourWallet snake-x402
```

## API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/v1/game/new` | POST | Free | Start a new game |
| `/v1/game/:id` | GET | Free | Get current game state |
| `/v1/game/move?gameId=:id` | POST | $0.001 | Make a move (x402 payment required) |
| `/v1/leaderboard` | GET | Free | Top 10 scores |
| `/health` | GET | Free | Health check |

## Game State Response

```json
{
  "gameId": "uuid",
  "state": "playing",
  "board": { "width": 20, "height": 20 },
  "snake": [{ "x": 10, "y": 10 }],
  "food": { "x": 5, "y": 5 },
  "score": 0,
  "moveCount": 0,
  "totalSpent": "0.000000",
  "gameOver": false,
  "paymentVerified": true
}
```

## Move Request

```bash
curl -X POST "http://localhost:3000/v1/game/move?gameId=YOUR_GAME_ID" \
  -H "Content-Type: application/json" \
  -H "X-Payment-Response: <x402-payment-header>" \
  -d '{"direction": "UP"}'
```

Directions: `UP`, `DOWN`, `LEFT`, `RIGHT`

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Payments:** x402 (@x402/hono, @x402/evm)
- **Validation:** Zod
- **Frontend:** Pure HTML/CSS/JS

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `PAYMENT_ADDRESS` | Yes | - | Your wallet address for receiving payments |
| `FACILITATOR_URL` | No | https://facilitator.daydreams.systems | x402 facilitator URL |
| `NETWORK` | No | eip155:8453 | Payment network (Base Mainnet) |

## Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage
```

Tests cover:
- Game creation
- Snake movement (all directions)
- Wall collision detection
- Self collision detection
- Food consumption and growth
- Score tracking
- Spending calculation
- Leaderboard sorting

## License

MIT
