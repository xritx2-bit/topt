const db = require('./db');
const config = require('../config');

// Get or initialize user account
function getUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      userId,
      wallet: config.currency.startingBalance,
      bank: 0,
      dailyStreak: 0,
      lastDaily: 0,
      lastWork: 0,
      lastBeg: 0,
      lastHunt: 0,
      lastGamble: 0,
      createdAt: Math.floor(Date.now() / 1000)
    };
    db.save('users');
  }
  return db.users[userId];
}

// Add TOPT to user's wallet
function addWallet(userId, amount) {
  const user = getUser(userId);
  user.wallet += Math.max(0, Math.floor(amount));
  db.save('users');
  return user;
}

// Remove TOPT from user's wallet
function removeWallet(userId, amount) {
  const user = getUser(userId);
  user.wallet = Math.max(0, user.wallet - Math.floor(amount));
  db.save('users');
  return user;
}

// Deposit from wallet to bank
function deposit(userId, amount) {
  const user = getUser(userId);
  const amt = Math.floor(amount);
  if (amt <= 0 || user.wallet < amt) return false;

  user.wallet -= amt;
  user.bank += amt;
  db.save('users');
  return true;
}

// Withdraw from bank to wallet
function withdraw(userId, amount) {
  const user = getUser(userId);
  const amt = Math.floor(amount);
  if (amt <= 0 || user.bank < amt) return false;

  user.bank -= amt;
  user.wallet += amt;
  db.save('users');
  return true;
}

// Transfer money from one user to another
function transfer(fromUserId, toUserId, amount) {
  const sender = getUser(fromUserId);
  const recipient = getUser(toUserId);
  const amt = Math.floor(amount);

  if (amt <= 0 || sender.wallet < amt) return false;

  sender.wallet -= amt;
  recipient.wallet += amt;
  db.save('users');
  return true;
}

// Claim daily reward with streak bonus
function claimDaily(userId) {
  const user = getUser(userId);
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;
  const twoDays = 172800;

  let newStreak = 1;
  const timeSinceLast = now - user.lastDaily;

  if (user.lastDaily > 0 && timeSinceLast < twoDays && timeSinceLast >= oneDay) {
    newStreak = Math.min(config.economy.daily.maxStreak, (user.dailyStreak || 0) + 1);
  } else if (user.lastDaily > 0 && timeSinceLast < oneDay) {
    // Cooldown not finished yet
    return { success: false, remaining: oneDay - timeSinceLast };
  }

  // Calculate total reward with streak bonus
  let bonusMultiplier = 1.0;
  // Check if user has VIP badge for 20% bonus
  if (hasItem(userId, 'vip_badge')) {
    bonusMultiplier += 0.20;
  }

  const baseStreakReward = config.economy.daily.baseAmount + (newStreak * config.economy.daily.streakBonus);
  const finalReward = Math.floor(baseStreakReward * bonusMultiplier);

  user.wallet += finalReward;
  user.dailyStreak = newStreak;
  user.lastDaily = now;
  db.save('users');

  return {
    success: true,
    reward: finalReward,
    streak: newStreak,
    isVip: hasItem(userId, 'vip_badge')
  };
}

// Check cooldown remaining in seconds (returns 0 if ready)
function getCooldownRemaining(userId, type, cooldownSeconds) {
  const user = getUser(userId);
  const now = Math.floor(Date.now() / 1000);
  const columnMap = {
    work: user.lastWork || 0,
    beg: user.lastBeg || 0,
    hunt: user.lastHunt || 0,
    gamble: user.lastGamble || 0,
    daily: user.lastDaily || 0
  };

  const lastUsed = columnMap[type] || 0;
  const diff = now - lastUsed;
  if (diff < cooldownSeconds) {
    return cooldownSeconds - diff;
  }
  return 0;
}

// Set cooldown timestamp
function setCooldown(userId, type) {
  const user = getUser(userId);
  const now = Math.floor(Date.now() / 1000);
  const keyMap = {
    work: 'lastWork',
    beg: 'lastBeg',
    hunt: 'lastHunt',
    gamble: 'lastGamble',
    daily: 'lastDaily'
  };

  const key = keyMap[type];
  if (key) {
    user[key] = now;
    db.save('users');
  }
}

// Add item to inventory
function addItem(userId, itemId, itemType = 'asset', quantity = 1) {
  if (!db.inventory[userId]) {
    db.inventory[userId] = [];
  }

  const inv = db.inventory[userId];
  const existing = inv.find(item => item.itemId === itemId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    inv.push({ itemId, itemType, quantity });
  }

  db.save('inventory');
}

// Remove item from inventory
function removeItem(userId, itemId, quantity = 1) {
  if (!db.inventory[userId]) return false;

  const inv = db.inventory[userId];
  const itemIndex = inv.findIndex(item => item.itemId === itemId);
  if (itemIndex === -1) return false;

  if (inv[itemIndex].quantity < quantity) return false;

  inv[itemIndex].quantity -= quantity;
  if (inv[itemIndex].quantity <= 0) {
    inv.splice(itemIndex, 1);
  }

  db.save('inventory');
  return true;
}

// Check if user has an item
function hasItem(userId, itemId) {
  if (!db.inventory[userId]) return false;
  const item = db.inventory[userId].find(i => i.itemId === itemId);
  return item && item.quantity > 0;
}

// Get user inventory
function getInventory(userId) {
  return db.inventory[userId] ? [...db.inventory[userId]] : [];
}

// Get richest users leaderboard
function getLeaderboard(limit = 10) {
  const allUsers = Object.values(db.users);
  return allUsers
    .map(u => ({
      userId: u.userId,
      wallet: u.wallet || 0,
      bank: u.bank || 0,
      totalNetWorth: (u.wallet || 0) + (u.bank || 0),
      dailyStreak: u.dailyStreak || 0
    }))
    .sort((a, b) => b.totalNetWorth - a.totalNetWorth)
    .slice(0, limit);
}

module.exports = {
  getUser,
  addWallet,
  removeWallet,
  deposit,
  withdraw,
  transfer,
  claimDaily,
  getCooldownRemaining,
  setCooldown,
  addItem,
  removeItem,
  hasItem,
  getInventory,
  getLeaderboard
};
