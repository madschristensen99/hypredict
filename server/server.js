const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/prediction_market',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const RateLimit = new Map();
function checkRateLimit(userId, limit = 10) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${userId}:${minute}`;
    
    const count = RateLimit.get(key) || 0;
    if (count >= limit) return false;
    
    RateLimit.set(key, count + 1);
    return true;
}

// Verify Telegram initData
function verifyTelegramAuth(initData) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) return false;

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const checkHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    return hash === checkHash;
}

// WebSocket connections
const connections = new Map();
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const auth = url.searchParams.get('auth');
    
    if (!auth || !verifyTelegramAuth(auth)) {
        ws.close();
        return;
    }

    const params = new URLSearchParams(auth);
    const userId = params.get('user') ? JSON.parse(params.get('user')).id : null;
    
    if (userId) {
        connections.set(userId, ws);
        ws.on('close', () => connections.delete(userId));
    }
});

// Broadcast updates
function broadcast(userId, message) {
    const ws = connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// API Routes

// Key generation for bot
app.post('/keygen', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId || !checkRateLimit(`bot:${userId}`, 5)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    try {
        const { generateKeyPair } = require('../encryption');
        const { publicKey, privateKey } = generateKeyPair();

        // Store keys encrypted with bot secret
        const encryptedPrivate = crypto.createCipher('aes-256-cbc', process.env.BOT_SECRET).update(privateKey, 'utf8', 'hex');

        await pool.query(
            'INSERT INTO users (user_id, public_key, private_key) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET public_key = $2, private_key = $3',
            [userId, publicKey, encryptedPrivate]
        );

        res.json({ pubKey: publicKey, privKey: privateKey });
    } catch (error) {
        console.error('Key generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create market
app.post('/market/create', async (req, res) => {
    const { question, userId, groupId } = req.body;
    
    if (!question || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const marketId = crypto.randomBytes(16).toString('hex');
        const encryptedHash = crypto.createHash('sha256').update(marketId).digest();
        
        await pool.query(
            'INSERT INTO markets (market_id, encrypted_data, encrypted_hash, creator_id, group_id, expires_at) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL \'7 days\')',
            [marketId, JSON.stringify({ question, userId }), encryptedHash, userId, groupId]
        );

        const miniAppUrl = `${process.env.MINI_APP_URL}?startapp=${marketId}`;
        res.json({ marketId, miniAppUrl });
    } catch (error) {
        console.error('Market creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get market data
app.get('/markets/:id', async (req, res) => {
    const { id } = req.params;
    const initData = req.query.auth;
    
    if (!initData || !verifyTelegramAuth(initData)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query('SELECT encrypted_data FROM markets WHERE market_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Market not found' });
        }

        res.json({ encrypted_blob: result.rows[0].encrypted_data });
    } catch (error) {
        console.error('Market fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit prediction
app.post('/prediction', async (req, res) => {
    const { marketId, encryptedData } = req.body;
    const initData = req.headers.authorization?.replace('tma ', '');
    
    if (!initData || !verifyTelegramAuth(initData)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const params = new URLSearchParams(initData);
    const userId = JSON.parse(params.get('user')).id;
    
    if (!userId || !checkRateLimit(`user:${userId}`)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    try {
        await pool.query(
            'INSERT INTO predictions (user_id, market_id, encrypted_data) VALUES ($1, $2, $3) ON CONFLICT (user_id, market_id) DO UPDATE SET encrypted_data = $3',
            [userId, marketId, encryptedData]
        );

        res.status(201).json({ txHash: crypto.createHash('sha256').update(encryptedData).digest('hex') });
    } catch (error) {
        console.error('Prediction submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user positions
app.get('/positions/:userId', async (req, res) => {
    const { userId } = req.params;
    const initData = req.query.auth;
    
    if (!initData || !verifyTelegramAuth(initData)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'SELECT market_id, encrypted_data FROM predictions WHERE user_id = $1',
            [userId]
        );

        res.json(result.rows.map(row => ({
            marketId: row.market_id,
            encryptedData: row.encrypted_data
        })));
    } catch (error) {
        console.error('Positions fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Resolve market (admin only)
app.post('/resolve', async (req, res) => {
    const { marketId, outcome } = req.body;
    const adminToken = req.headers['x-admin-token'];
    
    if (adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        await pool.query('UPDATE markets SET status = $1 WHERE market_id = $2', ['resolved', marketId]);
        
        // Broadcast to all connected users
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ marketId, resolved: true, outcome }));
            }
        });

        res.json({ txHash: crypto.randomBytes(32).toString('hex') });
    } catch (error) {
        console.error('Market resolution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});