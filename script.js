// ===== CONFIG =====
// If you deployed your frontend separately (e.g. to Vercel/Netlify),
// put your deployed backend URL here instead of the window.location fallback.
const PROD_BACKEND_URL = ''; // e.g. 'https://my-backend.onrender.com'
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001/api' 
    : (PROD_BACKEND_URL ? PROD_BACKEND_URL + '/api' : window.location.origin + '/api');

// ===== DOM ELEMENTS =====
const nav = document.querySelector('.nav');
const progressBarFill = document.querySelector('.progress-bar-fill');
const faqItems = document.querySelectorAll('.faq-item');
const tierCards = document.querySelectorAll('.tier-card');
const revealElements = document.querySelectorAll('.reveal');
const modalOverlay = document.getElementById('donateModal');
const modalClose = document.querySelector('.modal-close');
const customInput = document.getElementById('customAmount');
const customDonateBtn = document.getElementById('customDonateBtn');

let selectedAmount = 0;
let walletAddress = '';
let currentNetwork = 'trc20';

// ===== NAV SCROLL EFFECT =====
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== PROGRESS BAR ANIMATION =====
const observerProgress = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            progressBarFill.classList.add('animated');
            observerProgress.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

if (progressBarFill) {
    observerProgress.observe(progressBarFill);
}

// ===== SCROLL REVEAL =====
const observerReveal = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observerReveal.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => observerReveal.observe(el));

// ===== FAQ ACCORDION =====
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
    });
});

// ===== TIER SELECTION =====
tierCards.forEach(card => {
    const btn = card.querySelector('.tier-btn');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedAmount = parseInt(card.dataset.amount);
        openDonateModal(selectedAmount);
    });
    card.addEventListener('click', () => {
        tierCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
    });
});

// ===== CUSTOM AMOUNT =====
if (customDonateBtn) {
    customDonateBtn.addEventListener('click', () => {
        const val = parseInt(customInput.value);
        if (val && val > 0) {
            selectedAmount = val;
            openDonateModal(val);
        } else {
            customInput.style.borderColor = '#ef4444';
            setTimeout(() => customInput.style.borderColor = '', 1500);
        }
    });
}

// ===== DONATE MODAL =====
async function openDonateModal(amount) {
    selectedAmount = amount;

    // Build the modal content with wallet address
    const modal = document.querySelector('.modal');
    modal.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h3>Donate $${amount} USDT</h3>
    <p>Send exactly <strong>${amount} USDT</strong> to the address below <i class="fa-solid fa-heart" style="color: #0ef071;"></i></p>
    
    <div class="network-selector">
      <button class="network-btn active" data-network="trc20" onclick="switchNetwork('trc20', ${amount})">TRC20 <span class="network-tag">Cheapest</span></button>
      <button class="network-btn" data-network="erc20" onclick="switchNetwork('erc20', ${amount})">ERC20</button>
      <button class="network-btn" data-network="bep20" onclick="switchNetwork('bep20', ${amount})">BEP20</button>
    </div>
    
    <div class="wallet-address-box" id="walletAddressBox">
      <div class="loading-address">Loading wallet address...</div>
    </div>
    
    <div class="modal-form-section">
      <label for="donorName">Your Name (optional)</label>
      <input type="text" id="donorName" placeholder="Anonymous supporter" />
      <label for="donorMessage">Leave a Message (optional)</label>
      <textarea id="donorMessage" placeholder="Keep building! 🚀"></textarea>
      <button class="btn-primary" style="width:100%; justify-content:center;" onclick="registerDonation(${amount})">
        <i class="fa-solid fa-check"></i> I've Sent the USDT
      </button>
    </div>
  `;

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Fetch wallet address
    await fetchWalletAddress('trc20');
}

async function fetchWalletAddress(network) {
    const box = document.getElementById('walletAddressBox');
    box.innerHTML = '<div class="loading-address">Loading wallet address...</div>';

    try {
        const res = await fetch(`${API_BASE}/wallet-address?network=${network}`);
        const json = await res.json();

        if (json.status === 'success' && json.data) {
            const addr = json.data.address || json.data.wallet_address || JSON.stringify(json.data);
            walletAddress = addr;

            // Basic fallback url (unsigned)
            const fallbackUrl = `https://buy.moonpay.com?currencyCode=usdt&walletAddress=${addr}&baseCurrencyAmount=${selectedAmount}`;

            box.innerHTML = `
        <div class="address-label">USDT Deposit Address (${network.toUpperCase()})</div>
        <div class="address-value" id="addressText">${addr}</div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="copy-btn" onclick="copyAddress()" style="flex: 1; margin: 0;"><i class="fa-regular fa-clipboard"></i> Copy Address</button>
            <a href="${fallbackUrl}" id="moonpayBtn" target="_blank" class="copy-btn" style="flex: 1; margin: 0; background: #0ef071; text-decoration: none; display: flex; align-items: center; justify-content: center;"><i class="fa-regular fa-credit-card"></i> Pay with Card</a>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: 8px;">
            Card payments powered by MoonPay. Fiat converts to USDT automatically.
        </div>
      `;
      
            // Fetch production signed MoonPay URL from backend
            try {
                const mpRes = await fetch(`${API_BASE}/moonpay-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: selectedAmount, address: addr })
                });
                const mpJson = await mpRes.json();
                if (mpJson.url) {
                    document.getElementById('moonpayBtn').href = mpJson.url;
                }
            } catch (err) {
                console.error("Could not fetch secured MoonPay URL:", err);
            }
        } else {
            box.innerHTML = `
        <div class="address-label">USDT Deposit Address</div>
        <div class="address-value" style="font-size:0.85rem; color: var(--text-muted);">
          Contact Greaze directly for the wallet address.<br/>
          The Busha wallet is being configured.
        </div>
      `;
        }
    } catch (err) {
        box.innerHTML = `
      <div class="address-label">USDT Deposit Address</div>
      <div class="address-value" style="font-size:0.85rem; color: var(--text-muted);">
        Could not load address. Please try again or contact Greaze.
      </div>
    `;
    }
}

function switchNetwork(network, amount) {
    currentNetwork = network;
    document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.network-btn[data-network="${network}"]`).classList.add('active');
    fetchWalletAddress(network);
}

function copyAddress() {
    if (walletAddress) {
        navigator.clipboard.writeText(walletAddress);
        const btn = document.querySelector('.copy-btn');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-clipboard"></i> Copy Address', 2000);
    }
}

async function registerDonation(amount) {
    const name = document.getElementById('donorName')?.value || 'Anonymous';
    const message = document.getElementById('donorMessage')?.value || '';

    try {
        await fetch(`${API_BASE}/donate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ donor_name: name, message, amount_usdt: amount }),
        });
    } catch (e) {
        // Silent fail — donation still works via webhook
    }

    // Show success
    const modal = document.querySelector('.modal');
    modal.innerHTML = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 3rem; margin-bottom: 16px;">🎉</div>
      <h3 style="margin-bottom: 12px;">Thank You${name && name !== 'Anonymous' ? ', ' + name : ''}!</h3>
      <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 50px; background: rgba(255, 190, 11, 0.15); color: #ffbe0b; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
        <span class="status-dot pending-dot"></span> Pending Confirmation
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 8px;">
        Your donation of <strong style="background: var(--gradient-main); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${amount} USDT</strong> 
        has been registered and is awaiting on-chain confirmation.
      </p>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 24px;">
        Status will automatically update to <span style="color: #38b000; font-weight: 600;">✓ Confirmed</span> once Busha detects your transfer on the blockchain.
      </p>
      <button onclick="closeModal()" 
        style="padding: 14px 36px; background: var(--gradient-main); border: none; border-radius: 50px; color: #111; font-weight: 600; font-size: 1rem; cursor: pointer; font-family: 'Inter', sans-serif;">
        Close
      </button>
    </div>
  `;
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ===== COUNTER ANIMATION =====
function animateCounter(el, target, prefix = '', suffix = '') {
    // Parse current value from text content
    let current = parseInt(el.textContent.replace(/[^0-9-]/g, '')) || 0;
    if (current === target) return; // Prevent unnecessary animation on polling

    const diff = target - current;
    const step = Math.max(1, Math.floor(Math.abs(diff) / 30));
    const isIncreasing = target > current;

    const timer = setInterval(() => {
        if (isIncreasing) {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
        } else {
            current -= step;
            if (current <= target) {
                current = target;
                clearInterval(timer);
            }
        }
        el.textContent = prefix + current.toLocaleString() + suffix;
    }, 20);
}

// ===== FETCH LIVE CAMPAIGN DATA =====
async function loadCampaignData() {
    try {
        const res = await fetch(`${API_BASE}/campaign`);
        const json = await res.json();

        if (json.status === 'success') {
            const d = json.data;

            // Update hero card
            const fundRaised = document.querySelector('.fund-raised');
            const fundGoal = document.querySelector('.fund-goal');
            const fundInfo = document.querySelector('.fund-info');

            if (fundRaised) fundRaised.textContent = '$' + d.raised.toLocaleString();
            if (fundGoal) fundGoal.textContent = `of $${d.goal.toLocaleString()} goal`;
            if (fundInfo) {
                fundInfo.innerHTML = `<span>${d.percentage}% funded</span><span>${d.days_remaining} days remaining</span>`;
            }

            // Update progress bar
            if (progressBarFill) {
                progressBarFill.style.setProperty('--progress', d.percentage + '%');
            }

            // Update hero stats
            const statValues = document.querySelectorAll('.hero-stat-value');
            if (statValues[0]) {
                statValues[0].dataset.value = '$' + d.raised;
                animateCounter(statValues[0], d.raised, '$', '');
            }
            if (statValues[1]) {
                statValues[1].dataset.value = d.backers + '+';
                animateCounter(statValues[1], d.backers, '', '+');
            }
            if (statValues[2]) {
                statValues[2].dataset.value = d.days_remaining.toString();
                animateCounter(statValues[2], d.days_remaining, '', '');
            }
        }
    } catch (err) {
        console.log('Using fallback campaign data (server not running)');
    }
}

async function loadDonors() {
    try {
        const res = await fetch(`${API_BASE}/donors?limit=5`);
        const json = await res.json();

        const list = document.querySelector('.supporters-list');
        if (!list) return;

        if (json.status === 'success' && json.data.length > 0) {
            const colors = ['#ffbe0b', '#2563EB', '#38b000', '#ff006e', '#8338ec'];

            list.innerHTML = json.data.map((d, i) => {
                const initial = (d.donor_name || 'A')[0].toUpperCase();
                const timeAgo = getTimeAgo(d.created_at);
                const isPending = d.status === 'pending';
                const statusBadge = isPending 
                    ? `<span class="status-badge pending"><span class="status-dot pending-dot"></span>Pending</span>`
                    : `<span class="status-badge confirmed"><span class="status-dot confirmed-dot"></span>Confirmed</span>`;
                return `
          <div class="supporter-card reveal visible">
            <div class="supporter-avatar" style="background: ${colors[i % colors.length]};">${initial}</div>
            <div class="supporter-info">
              <div class="supporter-name">${d.donor_name || 'Anonymous'} ${statusBadge}</div>
              <div class="supporter-msg">"${d.message || 'No message'}"</div>
            </div>
            <div>
              <div class="supporter-amount">$${d.amount_usdt}</div>
              <div class="supporter-time">${timeAgo}</div>
            </div>
          </div>
        `;
            }).join('');
            
            // Show the supporters section
            const supportersSection = document.getElementById('supporters');
            if (supportersSection) supportersSection.style.display = 'block';

            // Dynamically build the avatar bubbles in the hero card
            const heroAvatarsContainer = document.querySelector('.backers-avatars');
            if (heroAvatarsContainer) {
                // Determine the total backers count from the hero stat if available
                const totalBackersStr = document.querySelectorAll('.hero-stat-value')[1]?.dataset.value || '0+';
                const totalBackers = parseInt(totalBackersStr.replace(/[^0-9]/g, '')) || json.data.length;

                let avatarsHtml = '';
                // Add up to 5 bubbles based on recent donors
                json.data.slice(0, 5).forEach((d, i) => {
                    const initial = (d.donor_name || 'A')[0].toUpperCase();
                    avatarsHtml += `<div class="avatar" style="background: ${colors[i % colors.length]};">${initial}</div>`;
                });
                
                if (totalBackers > 5) {
                    avatarsHtml += `<div class="avatar avatar-count">+${totalBackers - 5}</div>`;
                }
                
                avatarsHtml += `<span class="backers-text">people have backed this campaign</span>`;
                
                heroAvatarsContainer.innerHTML = avatarsHtml;
                heroAvatarsContainer.style.display = 'flex'; // Show them
            }

        } else if (json.status === 'success') {
            // Hide the supporters section entirely when 0 backers
            const supportersSection = document.getElementById('supporters');
            if (supportersSection) supportersSection.style.display = 'none';
        }
    } catch (err) {
        console.log('Using fallback donor data (server not running)');
    }
}

function getTimeAgo(dateStr) {
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hours ago';
    const days = Math.floor(hrs / 24);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

// ===== HERO STATS COUNTER =====
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statValues = entry.target.querySelectorAll('.hero-stat-value');
            statValues.forEach(sv => {
                const raw = sv.dataset.value;
                const num = parseInt(raw.replace(/[^0-9]/g, ''));
                const prefix = raw.includes('$') ? '$' : '';
                const suf = raw.includes('+') ? '+' : '';
                animateCounter(sv, num, prefix, suf);
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

// ===== FUND NOW BUTTONS =====
document.querySelectorAll('[data-action="fund"]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('tiers').scrollIntoView({ behavior: 'smooth' });
    });
});

// ===== LOAD DATA ON PAGE READY =====
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadCampaignData();
    loadDonors();

    // Poll for real-time updates every 10 seconds
    setInterval(() => {
        loadCampaignData();
        loadDonors();
    }, 10000);
});

// ===== THEME TOGGLE =====
const themeToggleBtn = document.querySelector('.theme-toggle');
const htmlTag = document.documentElement;

// Function to immediately setup theme with no transitions during initial load
function applyTheme(theme) {
    if (theme === 'dark') {
        htmlTag.setAttribute('data-theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        htmlTag.removeAttribute('data-theme');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function initializeTheme() {
    const storedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme) {
        applyTheme(storedTheme);
    } else if (systemDark) {
        applyTheme('dark');
    }
}

// Run immediately before page fully repaints
initializeTheme();

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isDark = htmlTag.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        // Add a smooth transition class to body temporarily when clicking button
        document.body.style.transition = 'background-color 0.4s, color 0.4s';
        setTimeout(() => document.body.style.transition = '', 400);

        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Listen for system theme changes if not overridden by user
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});
