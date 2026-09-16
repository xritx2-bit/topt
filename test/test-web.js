const assert = require('assert');
const http = require('http');
const { startWebServer } = require('../src/web/server');

console.log('🧪 Starting Web Console & API Validation Suite...\n');

// Mock a lightweight client for test
const mockClient = {
  isReady: () => true,
  user: { tag: 'TOPT ENGINE#7788', displayAvatarURL: () => 'https://example.com/avatar.png' },
  ws: { ping: 42 },
  guilds: {
    cache: new Map([
      ['guild_test', {
        id: 'guild_test',
        name: 'Test Trading Server',
        systemChannel: null,
        channels: { cache: new Map() }
      }]
    ])
  },
  users: {
    cache: new Map(),
    fetch: async (id) => ({ id, tag: `User_${id}`, send: async () => true })
  }
};

const server = startWebServer(mockClient);
const PORT = process.env.PORT || 3000;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: postData ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      } : {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    // 1. Test /health
    console.log('▶ [1/4] Testing /health endpoint...');
    const health = await makeRequest('/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'ok');
    assert.strictEqual(health.data.botName, 'TOPT ENGINE');
    console.log('✅ Health check endpoint passed!');

    // 2. Test /api/stats and /api/market
    console.log('\n▶ [2/4] Testing /api/stats and /api/market endpoints...');
    const stats = await makeRequest('/api/stats');
    assert.strictEqual(stats.status, 200);
    assert.strictEqual(stats.data.bot.name, 'TOPT ENGINE');

    const market = await makeRequest('/api/market');
    assert.strictEqual(market.status, 200);
    assert(Array.isArray(market.data.history), 'Market history should be an array');
    console.log('✅ Stats & Market endpoints passed!');

    // 3. Test /api/terminal
    console.log('\n▶ [3/4] Testing /api/terminal execution...');
    const termRes = await makeRequest('/api/terminal', 'POST', { command: 'help' });
    assert.strictEqual(termRes.status, 200);
    assert(termRes.data.output.includes('TOPT ENGINE Cyber Command Terminal'));

    const termStatus = await makeRequest('/api/terminal', 'POST', { command: 'status' });
    assert(termStatus.data.output.includes('[STATUS] Engine: ONLINE'));
    console.log('✅ Web CLI Terminal passed all assertions!');

    // 4. Test /api/automod/toggle
    console.log('\n▶ [4/4] Testing /api/automod/toggle...');
    const toggleRes = await makeRequest('/api/automod/toggle', 'POST', { feature: 'antiSpam', enabled: true });
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.data.enabled, true);
    console.log('✅ AutoMod toggle switch passed!');

    console.log('\n🎉 ALL WEB CONSOLE TESTS PASSED SUCCESSFULLY!');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Web test failed:', err);
    server.close();
    process.exit(1);
  }
})();
