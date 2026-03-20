const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'campaign.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ===== SCHEMA =====
db.exec(`
  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_name TEXT DEFAULT 'Anonymous',
    message TEXT DEFAULT '',
    amount_usdt REAL NOT NULL,
    network TEXT,
    tx_hash TEXT UNIQUE,
    busha_transfer_id TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaign (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT DEFAULT 'Help Me Build the Future of Web3',
    goal_usdt REAL DEFAULT 5000,
    creator_name TEXT DEFAULT 'Greaze',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO campaign (id) VALUES (1);
`);

// ===== QUERIES =====

// Donations
const insertDonation = db.prepare(`
  INSERT INTO donations (donor_name, message, amount_usdt, network, tx_hash, busha_transfer_id, status)
  VALUES (@donor_name, @message, @amount_usdt, @network, @tx_hash, @busha_transfer_id, @status)
`);

const getDonations = db.prepare(`
  SELECT id, donor_name, message, amount_usdt, network, status, created_at
  FROM donations
  ORDER BY created_at DESC
  LIMIT ?
`);

const getDonationByTxHash = db.prepare(`
  SELECT * FROM donations WHERE tx_hash = ?
`);

const getTotalRaised = db.prepare(`
  SELECT COALESCE(SUM(amount_usdt), 0) as total FROM donations WHERE status = 'confirmed'
`);

const getBackersCount = db.prepare(`
  SELECT COUNT(*) as count FROM donations WHERE status = 'confirmed'
`);

// Campaign
const getCampaign = db.prepare(`
  SELECT * FROM campaign WHERE id = 1
`);

module.exports = {
    db,
    insertDonation,
    getDonations,
    getDonationByTxHash,
    getTotalRaised,
    getBackersCount,
    getCampaign,
};
