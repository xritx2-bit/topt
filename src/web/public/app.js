// ==========================================
// TOPT ENGINE Cyber Command Center Controller
// ==========================================

let activeTab = 'overview';
let activeLogFilter = 'ALL';
let terminalHistory = [];
let historyIndex = -1;
let currentStats = null;
let currentMarket = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTerminal();
  setupSecurityControls();
  fetchStats();
  fetchMarketData();
  fetchTickets();

  // Polling loops
  setInterval(fetchStats, 2500);
  setInterval(fetchMarketData, 5000);
  setInterval(fetchTickets, 4000);
});

// ------------------------------------------
// Navigation & Tab Switching
// ------------------------------------------
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-tab');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabName}`);
  });

  if (tabName === 'overview') {
    renderMarketChart();
  }
}

// ------------------------------------------
// Fetch & Render Stats
// ------------------------------------------
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    currentStats = data;

    // Header Vitals
    document.getElementById('bot-tag-header').textContent = data.bot.tag;
    document.getElementById('threat-badge').textContent = `THREAT STATUS: ${data.bot.threatLevel}`;
    document.getElementById('threat-badge').className = `threat-badge ${data.bot.threatLevel.toLowerCase()}`;
    document.getElementById('ping-display').textContent = `${data.bot.ping} ms`;
    document.getElementById('mem-display').textContent = `${data.bot.memoryMb} MB`;
    document.getElementById('uptime-display').textContent = formatUptime(data.bot.uptime);

    // Overview Metric Cards
    document.getElementById('metric-circ').textContent = `🪙 ${data.economy.totalCirculation.toLocaleString()} TOPT`;
    document.getElementById('metric-traders').textContent = `${data.economy.registeredTraders} Traders Registered`;
    document.getElementById('metric-tickets').textContent = `${data.security.activeTickets} Open Tickets`;
    document.getElementById('metric-warnings').textContent = `${data.security.totalWarnings} Infractions Logged`;
    document.getElementById('metric-servers').textContent = `${data.bot.guilds} Server (${data.bot.users} Users)`;

    // Render Leaderboards in Economy Tab & Overview
    renderLeaderboards(data.economy.topTraders);

    // Sync AutoMod switch toggles if in Security Tab
    syncSecurityToggles(data.security);

    // Render Logs Stream
    renderLogs(data.logs || []);
  } catch (err) {
    console.error('Failed to sync engine stats:', err);
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// ------------------------------------------
// TOPT Financial Market Chart (SVG & Canvas)
// ------------------------------------------
async function fetchMarketData() {
  try {
    const res = await fetch('/api/market');
    const data = await res.json();
    currentMarket = data;

    document.getElementById('price-value').textContent = `$${data.currentPrice.toFixed(4)} USD`;
    document.getElementById('mcap-value').textContent = `$${data.marketCap.toLocaleString()} USD`;
    document.getElementById('vol-value').textContent = `🪙 ${data.volume24h.toLocaleString()} TOPT`;
    document.getElementById('high-value').textContent = `$${data.high24h.toFixed(4)}`;
    document.getElementById('low-value').textContent = `$${data.low24h.toFixed(4)}`;

    renderMarketChart();
  } catch (err) {
    console.error('Failed to fetch market data:', err);
  }
}

function renderMarketChart() {
  const canvas = document.getElementById('marketCanvas');
  if (!canvas || !currentMarket || !currentMarket.history) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const points = currentMarket.history;

  ctx.clearRect(0, 0, width, height);

  if (points.length < 2) return;

  const minP = Math.min(...points.map(p => p.price)) * 0.98;
  const maxP = Math.max(...points.map(p => p.price)) * 1.02;

  // Coordinate mapper
  const getX = (i) => (i / (points.length - 1)) * (width - 40) + 20;
  const getY = (price) => height - 30 - ((price - minP) / (maxP - minP)) * (height - 60);

  // Draw Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw Area Gradient
  const areaGradient = ctx.createLinearGradient(0, 0, 0, height);
  areaGradient.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
  areaGradient.addColorStop(1, 'rgba(138, 43, 226, 0.0)');

  ctx.beginPath();
  ctx.moveTo(getX(0), height);
  for (let i = 0; i < points.length; i++) {
    const x = getX(i);
    const y = getY(points[i].price);
    if (i === 0) ctx.lineTo(x, y);
    else {
      const prevX = getX(i - 1);
      const prevY = getY(points[i - 1].price);
      const midX = (prevX + x) / 2;
      ctx.bezierCurveTo(midX, prevY, midX, y, x, y);
    }
  }
  ctx.lineTo(getX(points.length - 1), height);
  ctx.closePath();
  ctx.fillStyle = areaGradient;
  ctx.fill();

  // Draw Glowing Price Line
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = getX(i);
    const y = getY(points[i].price);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevX = getX(i - 1);
      const prevY = getY(points[i - 1].price);
      const midX = (prevX + x) / 2;
      ctx.bezierCurveTo(midX, prevY, midX, y, x, y);
    }
  }
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0; // reset shadow

  // Draw Current Pulsing Price Marker
  const lastX = getX(points.length - 1);
  const lastY = getY(points[points.length - 1].price);

  ctx.fillStyle = '#05ffa1';
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------
// Interactive CLI Terminal
// ------------------------------------------
function setupTerminal() {
  const termInput = document.getElementById('terminal-input');
  const termOutput = document.getElementById('terminal-output');
  const filterButtons = document.querySelectorAll('.log-filter-btn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLogFilter = btn.getAttribute('data-filter');
      if (currentStats) renderLogs(currentStats.logs || []);
    });
  });

  document.getElementById('btn-clear-term')?.addEventListener('click', () => {
    termOutput.innerHTML = '';
  });

  termInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      if (!cmd) return;

      terminalHistory.push(cmd);
      historyIndex = terminalHistory.length;
      termInput.value = '';

      printTerminalLine(`topt > ${cmd}`, 'prompt');

      if (cmd.toLowerCase() === 'cls' || cmd.toLowerCase() === 'clear') {
        termOutput.innerHTML = '';
        return;
      }

      try {
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        printTerminalLine(data.output, data.success ? 'success' : 'error');
      } catch (err) {
        printTerminalLine(`Network Error: ${err.message}`, 'error');
      }
    } else if (e.key === 'ArrowUp') {
      if (historyIndex > 0) {
        historyIndex--;
        termInput.value = terminalHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex < terminalHistory.length - 1) {
        historyIndex++;
        termInput.value = terminalHistory[historyIndex];
      } else {
        historyIndex = terminalHistory.length;
        termInput.value = '';
      }
    }
  });
}

function printTerminalLine(text, type = 'info') {
  const termOutput = document.getElementById('terminal-output');
  const div = document.createElement('div');
  div.className = `term-line term-${type}`;
  div.textContent = text;
  termOutput.appendChild(div);
  termOutput.scrollTop = termOutput.scrollHeight;
}

function renderLogs(logs) {
  const logStream = document.getElementById('log-stream');
  if (!logStream) return;

  const filtered = logs.filter(l => activeLogFilter === 'ALL' || l.type === activeLogFilter);
  if (filtered.length === 0) {
    logStream.innerHTML = `<div class="empty-logs">No ${activeLogFilter} events recorded.</div>`;
    return;
  }

  logStream.innerHTML = filtered.map(l => {
    const timeStr = new Date(l.time).toLocaleTimeString();
    return `
      <div class="log-entry log-type-${l.type.toLowerCase()}">
        <span class="log-time">[${timeStr}]</span>
        <span class="log-badge">${l.type}</span>
        <span class="log-msg">${escapeHtml(l.message)}</span>
      </div>
    `;
  }).join('');
}

// ------------------------------------------
// Security & AutoMod Switchboard
// ------------------------------------------
function setupSecurityControls() {
  const toggles = ['antiInvite', 'antiLink', 'antiSpam', 'antiNuke'];

  toggles.forEach(feature => {
    const el = document.getElementById(`toggle-${feature}`);
    if (el) {
      el.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        try {
          await fetch('/api/automod/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature, enabled })
          });
        } catch (err) {
          console.error('Failed to toggle feature:', err);
        }
      });
    }
  });

  // Blacklist word addition
  const wordInput = document.getElementById('input-blacklist-word');
  const btnAddWord = document.getElementById('btn-add-word');

  if (btnAddWord && wordInput) {
    btnAddWord.addEventListener('click', async () => {
      const word = wordInput.value.trim();
      if (!word) return;

      try {
        await fetch('/api/automod/word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', word })
        });
        wordInput.value = '';
        fetchStats();
      } catch (err) {
        console.error('Failed to add word:', err);
      }
    });
  }
}

function syncSecurityToggles(securityData) {
  if (!securityData) return;

  const autoConf = securityData.automod || {};
  const nukeConf = securityData.antinuke || {};

  setSwitch('antiInvite', autoConf.antiInvite);
  setSwitch('antiLink', autoConf.antiLink);
  setSwitch('antiSpam', autoConf.antiSpam);
  setSwitch('antiNuke', nukeConf.enabled);

  // Blacklist words tags
  const tagsContainer = document.getElementById('blacklist-tags');
  if (tagsContainer && Array.isArray(autoConf.bannedWords)) {
    tagsContainer.innerHTML = autoConf.bannedWords.map(w => `
      <span class="word-tag">
        ${escapeHtml(w)}
        <button class="btn-remove-word" onclick="removeBannedWord('${escapeHtml(w)}')">&times;</button>
      </span>
    `).join('');
  }
}

function setSwitch(id, value) {
  const el = document.getElementById(`toggle-${id}`);
  if (el) el.checked = !!value;
}

async function removeBannedWord(word) {
  try {
    await fetch('/api/automod/word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', word })
    });
    fetchStats();
  } catch (err) {
    console.error('Failed to remove word:', err);
  }
}

// ------------------------------------------
// ModMail Support Dispatcher
// ------------------------------------------
async function fetchTickets() {
  try {
    const res = await fetch('/api/tickets');
    const tickets = await res.json();
    renderTicketsList(tickets);
  } catch (err) {
    console.error('Failed to fetch tickets:', err);
  }
}

function renderTicketsList(tickets) {
  const container = document.getElementById('tickets-container');
  if (!container) return;

  const openTickets = tickets.filter(t => t.status === 'open');

  if (openTickets.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📬</div>
        <h3>No Pending Inquiries</h3>
        <p>All direct messages from server members have been addressed.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = openTickets.map(t => {
    const timeAgo = formatTimeAgo(t.createdAt);
    return `
      <div class="ticket-card" id="ticket-card-${t.ticketId}">
        <div class="ticket-header">
          <div class="ticket-user">
            <span class="user-avatar-badge">👤</span>
            <div>
              <h4>Member: <code>${t.userId}</code></h4>
              <span class="ticket-ref">ID: ${t.ticketId} • Opened ${timeAgo}</span>
            </div>
          </div>
          <span class="status-pill open">OPEN</span>
        </div>
        <div class="ticket-reply-box">
          <input type="text" id="reply-input-${t.ticketId}" class="cyber-input" placeholder="Type DM reply to send to user...">
          <button class="cyber-btn primary" onclick="sendTicketReply('${t.ticketId}')">Send Reply</button>
        </div>
      </div>
    `;
  }).join('');
}

async function sendTicketReply(ticketId) {
  const input = document.getElementById(`reply-input-${ticketId}`);
  if (!input) return;

  const replyText = input.value.trim();
  if (!replyText) return;

  try {
    const res = await fetch('/api/modmail/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, replyText })
    });
    const data = await res.json();

    if (data.success) {
      input.value = '';
      input.placeholder = '✅ Reply delivered to user DM!';
      setTimeout(() => {
        input.placeholder = 'Type DM reply to send to user...';
      }, 3000);
    } else {
      alert(`Failed: ${data.message}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ------------------------------------------
// Leaderboard & Tables
// ------------------------------------------
function renderLeaderboards(topTraders) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  if (!topTraders || topTraders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No trader balances recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = topTraders.map((t, idx) => `
    <tr>
      <td><span class="rank-badge rank-${idx + 1}">#${idx + 1}</span></td>
      <td><code>${t.userId}</code></td>
      <td><strong>🪙 ${t.totalNetWorth.toLocaleString()} TOPT</strong></td>
      <td>🪙 ${t.wallet.toLocaleString()}</td>
      <td>🔥 ${t.dailyStreak}d</td>
    </tr>
  `).join('');
}

// ------------------------------------------
// Utilities
// ------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function formatTimeAgo(timestamp) {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
