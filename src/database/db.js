const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache for ultra-fast reads
const cache = {
  users: {},
  inventory: {},
  vouches: [],
  selfroles: {},
  settings: {},
  tickets: {},
  warnings: [],
  automod: {},
  antinuke: {},
  auditLogs: []
};

// Safe load from JSON file
function loadFile(name, defaultValue) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[DB Error] Failed to read ${name}.json:`, err);
  }
  saveFile(name, defaultValue);
  return defaultValue;
}

// Atomic save to JSON file
function saveFile(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  const tempPath = path.join(DATA_DIR, `${name}.tmp`);
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Fallback direct write if rename fails (e.g. Windows file locking)
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (innerErr) {
      console.error(`[DB Error] Failed to write ${name}.json:`, innerErr);
    }
  }
}

// Initialize collections
cache.users = loadFile('users', {});
cache.inventory = loadFile('inventory', {});
cache.vouches = loadFile('vouches', []);
cache.selfroles = loadFile('selfroles', {});
cache.settings = loadFile('settings', {});
cache.tickets = loadFile('tickets', {});
cache.warnings = loadFile('warnings', []);
cache.automod = loadFile('automod', {});
cache.antinuke = loadFile('antinuke', {});
cache.auditLogs = loadFile('auditLogs', []);

module.exports = {
  get users() { return cache.users; },
  get inventory() { return cache.inventory; },
  get vouches() { return cache.vouches; },
  get selfroles() { return cache.selfroles; },
  get settings() { return cache.settings; },
  get tickets() { return cache.tickets; },
  get warnings() { return cache.warnings; },
  get automod() { return cache.automod; },
  get antinuke() { return cache.antinuke; },
  get auditLogs() { return cache.auditLogs; },

  save(collectionName) {
    if (cache[collectionName] !== undefined) {
      saveFile(collectionName, cache[collectionName]);
    }
  }
};
