require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const busha = require('./busha');
const {
    insertDonation,
    getDonations,
    getDonationByTxHash,
    getTotalRaised,
    getBackersCount,
    getCampaign,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const CAMPAIGN_GOAL = parseFloat(process.env.CAMPAIGN_GOAL_USDT || 5000);

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Serve the frontend from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ===== ROUTES =====

/**
 * GET /api/campaign
 * Returns campaign stats: raised, goal, backers, percentage
 */
app.get('/api/campaign', (req, res) => {
    try {
        const campaign = getCampaign.get();
        const raised = getTotalRaised.get();
        const backers = getBackersCount.get();
        const totalRaised = raised.total;
        const percentage = Math.min(100, Math.round((totalRaised / CAMPAIGN_GOAL) * 100));

        res.json({
            status: 'success',
            data: {
                title: campaign.title,
                creator: campaign.creator_name,
                goal: CAMPAIGN_GOAL,
                raised: totalRaised,
                backers: backers.count,
                percentage,
                days_remaining: 18, // You can make this dynamic later
            },
        });
    } catch (err) {
        console.error('Campaign fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch campaign data' });
    }
});

/**
 * GET /api/balance
 * Returns real-time USDT balance from Busha
 */
app.get('/api/balance', async (req, res) => {
    try {
        const balance = await busha.getUSDTBalance();
        res.json({ status: 'success', data: balance });
    } catch (err) {
        console.error('Balance fetch error:', err.message);
        res.status(502).json({ error: 'Failed to fetch balance from Busha', details: err.message });
    }
});

/**
 * GET /api/wallet-address
 * Returns the USDT deposit address for the campaign wallet
 * Query param: ?network=trc20 (default: trc20)
 */
app.get('/api/wallet-address', async (req, res) => {
    try {
        const network = req.query.network || 'trc20';
        const address = await busha.getDepositAddress(network);
        res.json({ status: 'success', data: address, network });
    } catch (err) {
        console.error('Address fetch error:', err.message);
        res.status(502).json({ error: 'Failed to fetch wallet address', details: err.message });
    }
});

/**
 * GET /api/donors
 * Returns recent donors list
 * Query param: ?limit=10
 */
app.get('/api/donors', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const donors = getDonations.all(limit);
        res.json({ status: 'success', data: donors });
    } catch (err) {
        console.error('Donors fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch donors' });
    }
});

/**
 * POST /api/webhooks/busha
 * Receives deposit notifications from Busha
 * Updates the donations DB in real time
 */
app.post('/api/webhooks/busha', (req, res) => {
    try {
        // Verify webhook signature if secret is configured
        const webhookSecret = process.env.WEBHOOK_SECRET;
        if (webhookSecret && webhookSecret !== 'your_webhook_secret_here') {
            const signature = req.headers['x-busha-signature'] || req.headers['x-webhook-signature'];
            if (signature) {
                const expected = crypto
                    .createHmac('sha256', webhookSecret)
                    .update(JSON.stringify(req.body))
                    .digest('hex');
                if (signature !== expected) {
                    console.warn('Webhook signature mismatch');
                    return res.status(401).json({ error: 'Invalid signature' });
                }
            }
        }

        const event = req.body;
        console.log('Webhook received:', JSON.stringify(event, null, 2));

        // Handle deposit/charge events
        const eventType = event.event || event.type;
        if (
            eventType === 'charge.confirmed' ||
            eventType === 'transfer.completed' ||
            eventType === 'deposit.completed'
        ) {
            const data = event.data || event;
            const txHash = data.tx_hash || data.transaction_hash || data.id || `webhook_${Date.now()}`;

            // Prevent duplicate processing
            const existing = getDonationByTxHash.get(txHash);
            if (existing) {
                console.log('Duplicate webhook, skipping:', txHash);
                return res.json({ status: 'ok', message: 'Already processed' });
            }

            // Extract amount — adapt field names to what Busha actually sends
            const amount = parseFloat(
                data.amount || data.crypto_amount || data.value || 0
            );

            insertDonation.run({
                donor_name: data.customer_name || data.sender || 'Anonymous',
                message: data.description || data.memo || '',
                amount_usdt: amount,
                network: data.network || data.chain || 'unknown',
                tx_hash: txHash,
                busha_transfer_id: data.transfer_id || data.id || '',
                status: 'confirmed',
            });

            console.log(`✅ Donation recorded: ${amount} USDT from ${data.customer_name || 'Anonymous'}`);
        }

        // Always respond 200 so Busha doesn't retry
        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook processing error:', err);
        // Still respond 200 to prevent infinite retries
        res.json({ status: 'ok', error: err.message });
    }
});

/**
 * POST /api/donate
 * Manual donation registration (for when donors want to leave a name/message)
 * Body: { donor_name, message, amount_usdt }
 */
app.post('/api/donate', (req, res) => {
    try {
        const { donor_name, message, amount_usdt } = req.body;

        if (!amount_usdt || amount_usdt <= 0) {
            return res.status(400).json({ error: 'Invalid donation amount' });
        }

        const result = insertDonation.run({
            donor_name: donor_name || 'Anonymous',
            message: message || '',
            amount_usdt: parseFloat(amount_usdt),
            network: 'manual',
            tx_hash: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            busha_transfer_id: '',
            status: 'pending',
        });

        res.json({
            status: 'success',
            data: { id: result.lastInsertRowid },
            message: 'Donation registered! Send USDT to the campaign wallet to confirm.',
        });
    } catch (err) {
        console.error('Donate error:', err);
        res.status(500).json({ error: 'Failed to register donation' });
    }
});

/**
 * POST /api/payout
 * Request a payout (creator only — add auth in production)
 * Body: { currency: 'NGN' | 'KES' | 'USDT', amount }
 */
app.post('/api/payout', async (req, res) => {
    try {
        const { currency, amount } = req.body;

        if (!currency || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Currency and valid amount required' });
        }

        // Step 1: Create a quote
        const quote = await busha.createQuote('USDT', currency, amount);
        console.log('Payout quote:', quote);

        // Step 2: Execute the transfer
        const quoteId = quote.data?.id || quote.id;
        const transfer = await busha.createTransfer(quoteId);
        console.log('Payout transfer:', transfer);

        res.json({
            status: 'success',
            data: {
                quote: quote.data || quote,
                transfer: transfer.data || transfer,
            },
        });
    } catch (err) {
        console.error('Payout error:', err.message);
        res.status(502).json({ error: 'Payout failed', details: err.message });
    }
});

// ===== MOONPAY SIGNED URL =====
app.post('/api/moonpay-url', (req, res) => {
    const { amount, address } = req.body;
    const apiKey = process.env.MOONPAY_API_KEY;
    const secretKey = process.env.MOONPAY_SECRET_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'MoonPay configuration missing in .env' });
    }
    
    // Construct the live MoonPay widget URL for USDT
    const baseUrl = `https://buy.moonpay.com?apiKey=${apiKey}&currencyCode=usdt&walletAddress=${address}&baseCurrencyAmount=${amount}`;
    
    // If we have a secret key (live mode), HMAC sign the URL
    if (secretKey) {
        try {
            const signature = crypto
                .createHmac('sha256', secretKey)
                .update(new URL(baseUrl).search)
                .digest('base64');
            const signedUrl = `${baseUrl}&signature=${encodeURIComponent(signature)}`;
            return res.json({ url: signedUrl });
        } catch (e) {
            console.error('Failed to sign MoonPay URL:', e);
            return res.status(500).json({ error: 'Signature failure' });
        }
    }
    
    // Fallback: return unsigned if no secret key provided
    res.json({ url: baseUrl });
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== START =====
app.listen(PORT, () => {
    console.log(`\n🚀 GoFundGreaze server running at http://localhost:${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/api/webhooks/busha`);
    console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
});
