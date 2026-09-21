const config = require('../config');

// Keep-alive state
const keepAliveState = {
  active: false,
  targetUrl: null,
  intervalMinutes: 10,
  pingCount: 0,
  lastPingTime: null,
  lastPingStatus: 'WAITING',
  lastLatencyMs: 0,
  lastError: null,
  nextPingTime: null,
  timer: null
};

let loggerCallback = null;

function logMessage(type, message) {
  if (typeof loggerCallback === 'function') {
    loggerCallback(type, message);
  }
}

/**
 * Resolve target URL for keep-alive pings.
 * Render automatically provides RENDER_EXTERNAL_URL in its environment.
 */
function resolveKeepAliveUrl() {
  const customUrl = process.env.KEEP_ALIVE_URL || config.keepAliveUrl;
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }

  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl && renderUrl.trim()) {
    return renderUrl.trim();
  }

  return null;
}

/**
 * Normalizes the ping target URL to point to /health
 */
function formatHealthUrl(baseUrl) {
  if (!baseUrl) return null;
  let cleanUrl = baseUrl.replace(/\/+$/, '');
  if (!cleanUrl.endsWith('/health')) {
    cleanUrl += '/health';
  }
  return cleanUrl;
}

/**
 * Execute a single keep-alive ping
 */
async function sendPing() {
  if (!keepAliveState.targetUrl) return;

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(keepAliveState.targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'TOPT-Engine-KeepAlive/2.0 (24/7 Sentinel Pulse)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    keepAliveState.pingCount++;
    keepAliveState.lastPingTime = new Date().toISOString();
    keepAliveState.lastLatencyMs = latency;
    keepAliveState.lastPingStatus = response.ok ? 'OK' : `HTTP_${response.status}`;
    keepAliveState.lastError = null;

    const msg = `Pulse #${keepAliveState.pingCount} delivered to ${keepAliveState.targetUrl} [${response.status}] in ${latency}ms`;
    console.log(`💓 [KEEP-ALIVE] ${msg}`);
    logMessage('KEEPALIVE', msg);

    return { success: true, status: response.status, latency };
  } catch (err) {
    const latency = Date.now() - startTime;
    keepAliveState.lastPingTime = new Date().toISOString();
    keepAliveState.lastLatencyMs = latency;
    keepAliveState.lastPingStatus = 'FAILED';
    keepAliveState.lastError = err.message;

    const errMsg = `Ping failed to ${keepAliveState.targetUrl}: ${err.message}`;
    console.warn(`⚠️ [KEEP-ALIVE] ${errMsg}`);
    logMessage('KEEPALIVE', errMsg);

    return { success: false, error: err.message };
  }
}

/**
 * Start keep-alive automated polling
 * @param {Function} logEvent - Optional callback to register events into system log stream
 */
function startKeepAlive(logEvent) {
  if (logEvent) {
    loggerCallback = logEvent;
  }

  const rawUrl = resolveKeepAliveUrl();
  const intervalMins = parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES, 10) || 10;
  keepAliveState.intervalMinutes = Math.min(Math.max(intervalMins, 2), 14); // Safe interval between 2 and 14 mins

  if (!rawUrl) {
    keepAliveState.active = false;
    keepAliveState.targetUrl = null;
    keepAliveState.lastPingStatus = 'NO_EXTERNAL_URL';
    console.log('ℹ️ [KEEP-ALIVE] No external public URL detected.');
    console.log('   -> On Render: RENDER_EXTERNAL_URL is automatically detected when deployed.');
    console.log('   -> For local/custom: Set KEEP_ALIVE_URL=https://your-service.onrender.com in .env');
    logMessage('SYSTEM', 'Keep-Alive Sentinel waiting for external public URL configuration.');
    return;
  }

  keepAliveState.targetUrl = formatHealthUrl(rawUrl);
  keepAliveState.active = true;
  keepAliveState.lastPingStatus = 'ARMED';

  console.log(`⚡ [KEEP-ALIVE] Sentinel initialized. Target: ${keepAliveState.targetUrl}`);
  console.log(`   Pinging every ${keepAliveState.intervalMinutes} minutes to keep Render alive 24/7.`);
  logMessage('KEEPALIVE', `Sentinel armed for ${keepAliveState.targetUrl} (every ${keepAliveState.intervalMinutes}m)`);

  // Clear existing timer if any
  if (keepAliveState.timer) {
    clearInterval(keepAliveState.timer);
  }

  const intervalMs = keepAliveState.intervalMinutes * 60 * 1000;
  keepAliveState.nextPingTime = new Date(Date.now() + 20000).toISOString();

  // Initial pulse after 20 seconds to allow web server to complete startup
  keepAliveState.startupTimer = setTimeout(() => {
    sendPing();
    keepAliveState.nextPingTime = new Date(Date.now() + intervalMs).toISOString();

    // Periodic interval
    keepAliveState.timer = setInterval(() => {
      sendPing();
      keepAliveState.nextPingTime = new Date(Date.now() + intervalMs).toISOString();
    }, intervalMs);

    if (keepAliveState.timer && keepAliveState.timer.unref) {
      keepAliveState.timer.unref(); // Prevent timer from holding process open if exiting
    }
  }, 20000);

  if (keepAliveState.startupTimer && keepAliveState.startupTimer.unref) {
    keepAliveState.startupTimer.unref();
  }
}

/**
 * Stop keep-alive loop (for tests or clean shutdowns)
 */
function stopKeepAlive() {
  if (keepAliveState.startupTimer) clearTimeout(keepAliveState.startupTimer);
  if (keepAliveState.timer) clearInterval(keepAliveState.timer);
  keepAliveState.active = false;
}

/**
 * Get current keep-alive diagnostics
 */
function getKeepAliveStatus() {
  return {
    active: keepAliveState.active,
    targetUrl: keepAliveState.targetUrl,
    intervalMinutes: keepAliveState.intervalMinutes,
    pingCount: keepAliveState.pingCount,
    lastPingTime: keepAliveState.lastPingTime,
    lastPingStatus: keepAliveState.lastPingStatus,
    lastLatencyMs: keepAliveState.lastLatencyMs,
    lastError: keepAliveState.lastError,
    nextPingTime: keepAliveState.nextPingTime
  };
}

module.exports = {
  startKeepAlive,
  stopKeepAlive,
  getKeepAliveStatus,
  sendPing,
  resolveKeepAliveUrl,
  formatHealthUrl
};
