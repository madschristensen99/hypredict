# 🔮 Encrypted Telegram Prediction Market

This is an end-to-end encrypted prediction market bot and mini app that creates markets directly from Telegram group chats. All prediction data is encrypted client-side; the server never sees plaintext.

## 🏗️ Architecture Overview

Implemented according to the [spec.md](./spec.md) specification.

### Core Components

- **🤖 Bot** (`/bot`) - Command parser for group chats, handles ECDH key exchange via DMs
- **📱 Mini App** (`/mini-app`) - React SPA served over HTTPS with client-side encryption
- **🔧 Server** (`/server`) - Stateless API with WebSocket support
- **🔐 Encryption** (`/encryption`) - ECDH + AES-256-GCM encryption module
- **⚡ Smart Contract** (`/contracts`) - Solidity contract for on-chain settlement

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL
- Telegram Bot Token
- MetaMask (for smart contract interaction)

### 1. Set up Environment

```bash
# Clone the repository
git clone <your-repo>
cd encrypted-telegram-prediction-market

# Install root dependencies
npm install

# Set up environment files
cp server/.env.example server/.env
cp bot/.env.example bot/.env
cp contracts/.env.example contracts/.env
cp mini-app/.env.example mini-app/.env
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb prediction_market

# Run schema
psql -d prediction_market < server/schema.sql
```

### 3. Install Dependencies

```bash
# Install all dependencies
npm install

# Or install each component separately
cd server && npm install
cd ../bot && npm install
cd ../mini-app && npm install
cd ../contracts && npm install
```

### 4. Configuration

**Server (`server/.env`)**:
```bash
PORT=3000
DATABASE_URL=postgresql://localhost:5432/prediction_market
TELEGRAM_BOT_TOKEN=your_bot_token
BOT_SECRET=your_random_secret_for_bot_encryption
ADMIN_TOKEN=your_admin_token_for_resolution
MINI_APP_URL=https://your-mini-app.vercel.app
```

**Bot (`bot/.env`)**:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
API_URL=http://localhost:3000
ADMIN_USER_ID=your_user_id
ADMIN_TOKEN=your_admin_token
```

**Mini App (`mini-app/.env`)**:
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### 5. Run Development

```bash
# Start all services
npm run dev

# Or separately:
npm run dev:server   # API server on port 3000
npm run dev:bot      # Telegram bot
npm run dev:mini-app # React app on port 3001
```

### 6. Deploy Smart Contract

```bash
cd contracts
npm run compile

# Deploy to Sepolia testnet
npm run deploy
```

## 🔧 Usage

### Bot Commands

- `/join` - Generate encryption keys and join the encrypted pool
- `/predict <question>` - Create a new prediction market
- `/resolve <market_id> <yes|no>` - Resolve a market (admin only)
- `/keys` - Get your encryption keys again

### Creating Markets

1. In a group chat: `/predict "Will BTC hit 100k by end of 2024?"`
2. Bot generates encrypted market and provides mini app link
3. Users click link to make encrypted predictions

## 🔐 Security Features

- **End-to-End Encryption**: All prediction data encrypted client-side
- **ECDH Key Exchange**: Secure shared secrets between users and bot
- **Client-Only Decryption**: Server never sees plaintext
- **Rate Limiting**: 10 requests per minute per user
- **Telegram Auth**: All requests verified with Telegram HMAC signatures
- **Admin Controls**: Role-based resolution with 1-hour timelock

## 🚀 Deployment

### Backend (Railway)

```bash
# Setup Railway CLI
railway login

# Deploy backend
cd server
railway deploy
```

### Mini App (Vercel)

```bash
cd mini-app
vercel --prod
```

### Telegram Bot

1. Create bot with [@BotFather](https://t.me/botfather)
2. Set webhook: `https://your-backend.railway.app/bot{your-bot-token}`
3. Configure bot commands in BotFather

## 📊 Database Schema

```sql
CREATE TABLE users (
  user_id BIGINT PRIMARY KEY,
  public_key TEXT,
  private_key VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE markets (
  market_id TEXT PRIMARY KEY,
  encrypted_data TEXT,
  encrypted_hash BYTEA,
  creator_id BIGINT REFERENCES users(user_id),
  group_id BIGINT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  market_id TEXT REFERENCES markets(market_id),
  encrypted_data TEXT,
  tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

```bash
# Test encryption module
cd encryption && npm test

# Test contracts
cd contracts && npm test

# Test bot commands
cd bot && npm run dev
```

## 📱 Mini App Features

- **Responsive Design**: Works on all devices
- **Client-Side Encryption**: All data encrypted before sending
- **Real-time Updates**: WebSocket notifications for market changes
- **Shareable Links**: Easy sharing with other users
- **User Interface**: Clean, Telegram-native design

## 🔍 Troubleshooting

### Common Issues

1. **Bot doesn't respond**: Check TELEGRAM_BOT_TOKEN
2. **Encryption fails**: Ensure keys are properly generated via `/join`
3. **DB connection**: Check DATABASE_URL environment variable
4. **CORS errors**: Ensure API_URL is correctly configured in mini-app

### Getting Help

Check logs:
```bash
# Server logs
tail -f server/logs/combined.log

# Bot logs
tail -f bot/error.log

# Check contract deployment
hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

Built for the ETHGlobal and Telegram hackathon 2024 🎯