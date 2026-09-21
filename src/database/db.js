const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.resolve(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache for instant zero-latency reads
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

// Safe load from local JSON file
function loadFile(name, defaultValue) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[DB Error] Failed to read ${name}.json:`, err.message);
  }
  saveFile(name, defaultValue);
  return defaultValue;
}

// Atomic save to local JSON file
function saveFile(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  const tempPath = path.join(DATA_DIR, `${name}.tmp`);
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (innerErr) {
      console.error(`[DB Error] Failed to write ${name}.json:`, innerErr.message);
    }
  }
}

// Initialize collections from local disk
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

// ==========================================
// Cloud Persistence via MongoDB Atlas
// ==========================================
const CollectionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'topt_collections', minimize: false });

const CollectionModel = mongoose.models.ToptCollection || mongoose.model('ToptCollection', CollectionSchema);

let isMongoConnected = false;
const pendingSaves = new Set();
let saveTimeout = null;

function queueCloudSave(collectionName) {
  if (!isMongoConnected) return;
  pendingSaves.add(collectionName);

  if (!saveTimeout) {
    saveTimeout = setTimeout(async () => {
      saveTimeout = null;
      const toSave = Array.from(pendingSaves);
      pendingSaves.clear();

      for (const col of toSave) {
        try {
          await CollectionModel.updateOne(
            { _id: col },
            { $set: { data: cache[col], updatedAt: new Date() } },
            { upsert: true }
          );
        } catch (err) {
          console.error(`[DB Error] Failed to persist ${col} to MongoDB:`, err.message);
        }
      }
    }, 1200); // 1.2s debouncing for optimal batch writes
  }
}

async function initMongo() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri || !mongoUri.trim()) {
    console.log('ℹ️ [DB] Running with local file storage.');
    console.log('   -> To keep balances permanently across Render restarts, set MONGODB_URI in Render.');
    return false;
  }

  try {
    console.log('⏳ [DB] Connecting to MongoDB Atlas for cloud persistence...');
    await mongoose.connect(mongoUri.trim(), {
      serverSelectionTimeoutMS: 6000
    });
    isMongoConnected = true;
    console.log('✅ [DB] Connected to MongoDB Atlas! Cloud persistence is active.');

    // Hydrate in-memory collections from MongoDB Atlas
    const docs = await CollectionModel.find({});
    let loadedCount = 0;
    for (const doc of docs) {
      if (cache[doc._id] !== undefined && doc.data !== undefined) {
        cache[doc._id] = doc.data;
        saveFile(doc._id, doc.data);
        loadedCount++;
      }
    }
    console.log(`📦 [DB] Synced ${loadedCount} collections from MongoDB Atlas into memory.`);

    // If MongoDB has empty collections but local disk has data, upload local data to MongoDB
    if (loadedCount === 0) {
      console.log('📤 [DB] Initializing MongoDB Atlas with local starter data...');
      for (const col of Object.keys(cache)) {
        await CollectionModel.updateOne(
          { _id: col },
          { $set: { data: cache[col], updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    return true;
  } catch (err) {
    console.warn(`⚠️ [DB] MongoDB Atlas connection failed: ${err.message}`);
    console.warn('   -> Continuing with local disk storage.');
    return false;
  }
}

// Auto-init MongoDB if URI is configured in environment
if (process.env.MONGODB_URI || process.env.MONGO_URI) {
  initMongo().catch(() => {});
}

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
      queueCloudSave(collectionName);
    }
  },

  initMongo,

  getStorageStatus() {
    const hasUri = !!(process.env.MONGODB_URI || process.env.MONGO_URI);
    return {
      type: isMongoConnected ? 'MONGODB_ATLAS' : 'LOCAL_JSON',
      persistent: isMongoConnected,
      uriConfigured: hasUri,
      status: isMongoConnected ? '🟢 CLOUD PERSISTENT (MongoDB)' : '🟡 EPHEMERAL (Local JSON)'
    };
  },

  exportAll() {
    return JSON.parse(JSON.stringify(cache));
  },

  importAll(data) {
    if (!data || typeof data !== 'object') return false;
    for (const key of Object.keys(cache)) {
      if (data[key] !== undefined) {
        cache[key] = data[key];
        saveFile(key, data[key]);
        queueCloudSave(key);
      }
    }
    return true;
  }
};
