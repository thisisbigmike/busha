# 🚀 FundGreaze 

FundGreaze is a Web3-native crowdfunding platform (like a decentralized GoFundMe) built to seamlessly bridge the gap between Fiat and Crypto donations. 

Powered by **Busha** (for enterprise-grade crypto payment routing and webhooks) and **MoonPay** (for seamless Fiat-to-Crypto onramping), FundGreaze allows developers to raise funds for their journey using USDT, while providing their supporters with the easiest possible checkout experience—whether they are crypto-native or using a standard credit card.

## ✨ Features

- **Real-Time Campaign Tracking:** Live updating UI that polls the backend to dynamically animate the total funds raised, percentage goal, and number of backers.
- **Crypto-Native Donations:** Directly generate and display TRC20, ERC20, and BEP20 USDT deposit addresses powered by the Busha API.
- **Credit Card Onramp (MoonPay):** Non-crypto users can seamlessly donate via Mastercard or Visa. The backend dynamically generates a securely HMAC-signed checkout session that auto-converts fiat to USDT and sends it straight to the host's wallet.
- **Busha Webhooks Integration:** Fully automated donation reconciliation. When the blockchain verifies a deposit, Busha fires a webhook to the Node.js backend to instantly update the campaign database and broadcast the new donor on the frontend.
- **Automated Supporter Recognition:** Dynamic, color-coded avatar bubbles and a feed of recent supporters that auto-updates upon verified donation.

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (Zero-dependency, lightning-fast animations and polling)
- **Backend:** Node.js, Express.js
- **Database:** SQLite (`better-sqlite3`) 
- **APIs & Integrations:** 
  - [Busha API](https://busha.co/) for wallet address generation, balances, and deposit webhooks.
  - [MoonPay SDK/API](https://moonpay.com/) for direct-to-wallet fiat payments.

---

## ⚙️ Local Development Setup

### 1. Requirements
- Node.js (v16+)
- A Busha Developer Account & sandbox keys
- A MoonPay Developer Account (for live mode signature testing)

### 2. Installation Updates

Clone the repository and install the backend dependencies:

```bash
cd server
npm install
```

### 3. Environment Variables
In the `/server` directory, create a `.env` file (or update the existing one) with the following structure:

```env
# Busha API Configuration
BUSHA_API_KEY=your_base64_encoded_busha_key
BUSHA_BASE_URL=https://api.sandbox.busha.so/v1

# Busha Webhook Secret (Set this in Busha Dashboard)
WEBHOOK_SECRET=your_webhook_secret_here

# Campaign Wallet Addresses (Busha pre-generated wallets)
USDT_TRC20_ADDRESS=TRX_address_here
USDT_ERC20_ADDRESS=ETH_address_here
USDT_BEP20_ADDRESS=BNB_address_here

# Campaign Config
PORT=3001
CAMPAIGN_GOAL_USDT=5000

# MoonPay Config (Live or Test keys)
MOONPAY_API_KEY=pk_test_...
MOONPAY_SECRET_KEY=sk_test_... 
```

### 4. Running the Dev Server

To start the backend with automatic hot-reloading:

```bash
cd server
npm run dev
```

The server will automatically start at `http://localhost:3001`, and will serve the frontend UI from the root directory.

---

## 📡 Webhook Testing
If testing locally, you will need to expose your local port `3001` to the internet using a tool like **ngrok** so Busha can ping your webhook endpoint when a payment clears:

```bash
ngrok http 3001
```
Paste your ngrok URL into the Busha dashboard pointing to: `https://<your-ngrok-url>.ngrok.app/api/webhooks/busha`

## 🤝 Project Structure

- `/index.html`, `/styles.css`, `/script.js`: Core frontend interface.
- `/server/index.js`: Main Express API, frontend server, and MoonPay signature generator.
- `/server/busha.js`: Custom Busha API SDK wrapper.
- `/server/db.js`: SQLite Database initialization and queries.
- `/server/campaign.db`: Local SQLite database file.

---
*Built with ❤️ for the Web3 community.*
# busha
