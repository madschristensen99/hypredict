CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key VARCHAR(64) NOT NULL, -- Stored encrypted with bot's key  
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
    market_id TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    encrypted_hash BYTEA NOT NULL,
    creator_id BIGINT REFERENCES users(user_id),
    group_id BIGINT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    market_id TEXT REFERENCES markets(market_id),
    encrypted_data TEXT NOT NULL,
    tx_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_id);
CREATE INDEX IF NOT EXISTS idx_markets_group ON markets(group_id);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_market ON predictions(market_id);