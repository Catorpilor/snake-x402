# 🐍 Snake x402

A playable browser Snake game where direction changes cost $0.001 USDC via [x402](https://x402.org) micropayments.

## 🎮 Live Demo

**[https://demos.zeh.app/snake](https://demos.zeh.app/snake)**

Connect your wallet (Base network) and play! The snake moves automatically — you only pay when changing direction.

## Features

- Classic Snake gameplay with auto-movement
- Pay-per-turn: $0.001 USDC to change direction (movement is free!)
- x402 micropayments on Base network
- Real-time payment verification via facilitator
- In-game leaderboard
- Adjustable game speed
- Wallet connection (MetaMask, etc.)
- Pure HTML/CSS/JS frontend
- TypeScript backend with Hono

## How It Works

1. **Start a game** — Snake spawns moving right
2. **Auto-movement** — Snake moves automatically in current direction (FREE)
3. **Change direction** — Press arrow keys to turn ($0.001 USDC each)
4. **Eat food** — Grow longer, score points
5. **Game over** — Hit wall or yourself

**Play smart = fewer turns = less spent!**

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
docker build -t snake-x402 .
docker run -d -p 3402:3402 \
  -e PAYMENT_ADDRESS=0xYourWallet \
  -e PORT=3402 \
  snake-x402

# Or with docker-compose
docker-compose up -d
```

## API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/v1/game/new` | POST | Free | Start a new game |
| `/v1/game/:id` | GET | Free | Get current game state |
| `/v1/game/tick?gameId=:id` | POST | Free | Move snake forward (auto-movement) |
| `/v1/game/turn?gameId=:id` | POST | **$0.001** | Change direction (x402 payment required) |
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
  "direction": "RIGHT",
  "score": 0,
  "moveCount": 5,
  "directionChanges": 2,
  "totalSpent": "0.002000",
  "gameOver": false
}
```

## x402 Payment Flow

1. Client calls `/v1/game/turn` without payment
2. Server returns `402 Payment Required` with `PAYMENT-REQUIRED` header
3. Client's wallet signs the payment authorization
4. Client retries with `PAYMENT-SIGNATURE` header
5. Server verifies via facilitator and processes the turn

```bash
# Example: Turn request (will return 402 first)
curl -X POST "http://localhost:3402/v1/game/turn?gameId=YOUR_GAME_ID" \
  -H "Content-Type: application/json" \
  -d '{"direction": "UP"}'
```

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Payments:** x402 (@x402/hono, @x402/evm)
- **Validation:** Zod
- **Frontend:** Vanilla HTML/CSS/JS + ethers.js

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
- Game creation and state
- Auto-movement (tick)
- Direction changes (turn)
- Wall & self collision
- Food consumption
- Score & spending tracking
- Leaderboard

## License

MIT
