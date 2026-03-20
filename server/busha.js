/**
 * Busha API Client
 * Wraps Busha REST API for balance, wallet address, quotes, and transfers.
 * Docs: https://docs.busha.io
 */
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BUSHA_BASE_URL = process.env.BUSHA_BASE_URL || 'https://api.busha.co/v1';
const BUSHA_API_KEY = process.env.BUSHA_API_KEY;

async function bushaRequest(endpoint, options = {}) {
    const url = `${BUSHA_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${BUSHA_API_KEY}`,
            'Content-Type': 'application/json',
            // Default profile ID, in a real system this would come from a user or profile lookup
            // 'X-BU-PROFILE-ID': process.env.BUSHA_PROFILE_ID, 
            ...options.headers,
        },
    });

    const data = await res.json();

    if (!res.ok) {
        const errMsg = data?.error?.message || data?.message || `Busha API error: ${res.status}`;
        throw new Error(errMsg);
    }

    return data;
}

// ===== BALANCES =====

/**
 * Get all balances for the business account
 */
async function getBalances() {
    return bushaRequest('/balances');
}

/**
 * Get USDT balance specifically
 */
async function getUSDTBalance() {
    const result = await bushaRequest('/balances');
    const balances = result.data || result;

    // Find USDT balance
    const usdt = Array.isArray(balances)
        ? balances.find(b => b.currency === 'USDT' || b.asset === 'USDT')
        : null;

    let availableAmount = 0;
    if (usdt) {
        // Handle nested structure {"available": {"amount": "100"}} or flat structure {"available": "100"}
        if (typeof usdt.available === 'object' && usdt.available !== null) {
            availableAmount = parseFloat(usdt.available.amount) || 0;
        } else {
            availableAmount = parseFloat(usdt.available || usdt.balance || 0);
        }
    }

    return {
        available: availableAmount,
        currency: 'USDT',
        raw: usdt,
    };
}

// ===== WALLET ADDRESS =====

/**
 * Get or generate a deposit address for USDT on a given network
 * @param {string} network - 'tron' | 'ethereum' | 'bsc'
 */
async function getDepositAddress(network = 'tron') {
    // Map user-friendly network names to Busha's expected format
    const networkMap = {
        'trc20': 'tron',
        'erc20': 'ethereum',
        'bep20': 'bsc',
        'tron': 'tron',
        'ethereum': 'ethereum',
        'bsc': 'bsc',
    };

    const bushaNetwork = networkMap[network.toLowerCase()] || network;

    try {
        const result = await bushaRequest(`/addresses?currency=USDT&network=${bushaNetwork}`);
        return result.data || result;
    } catch (err) {
        // Fallback for Sandbox / Unconfigured accounts
        console.warn(`Busha Address API failed (${err.message}). Using fallback placeholder address.`);

        // Use real addresses from .env if the user configured them, otherwise use dummy addresses
        const fallbacks = {
            'tron': process.env.USDT_TRC20_ADDRESS || 'T-BushaDemoAddressTron99992384',
            'ethereum': process.env.USDT_ERC20_ADDRESS || '0xBushaDemoAddressEth888294723904',
            'bsc': process.env.USDT_BEP20_ADDRESS || '0xBushaDemoAddressBsc7773048590'
        };

        const finalAddress = fallbacks[bushaNetwork] || fallbacks.tron;

        return {
            address: finalAddress,
            network: bushaNetwork,
            currency: 'USDT',
            is_fallback: !finalAddress.startsWith('process.env') && finalAddress.includes('Demo')
        };
    }
}

// ===== QUOTES =====

/**
 * Create a conversion quote (e.g., USDT → NGN for payout)
 * @param {string} from - Source currency (e.g., 'USDT')
 * @param {string} to - Target currency (e.g., 'NGN')
 * @param {number} amount - Amount in source currency
 */
async function createQuote(from, to, amount) {
    return bushaRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
            source_currency: from,
            target_currency: to,
            amount: amount.toString(),
        }),
    });
}

// ===== TRANSFERS =====

/**
 * Execute a transfer from a quote (for payouts)
 * @param {string} quoteId - The quote ID to execute
 */
async function createTransfer(quoteId) {
    return bushaRequest('/transfers', {
        method: 'POST',
        body: JSON.stringify({
            quote_id: quoteId,
        }),
    });
}

/**
 * Get transfer status
 * @param {string} transferId
 */
async function getTransfer(transferId) {
    return bushaRequest(`/transfers/${transferId}`);
}

// ===== CUSTOMERS =====

/**
 * List customers (for tracking donors if needed)
 */
async function listCustomers() {
    return bushaRequest('/customers');
}

module.exports = {
    getBalances,
    getUSDTBalance,
    getDepositAddress,
    createQuote,
    createTransfer,
    getTransfer,
    listCustomers,
};
