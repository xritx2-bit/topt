const db = require('./db');

// Add a moderation warning
function addWarning({ guildId, userId, moderatorId, reason }) {
  const newWarn = {
    id: db.warnings.length > 0 ? Math.max(...db.warnings.map(w => w.id)) + 1 : 1,
    guildId,
    userId,
    moderatorId,
    reason: (reason || 'No reason provided').trim(),
    timestamp: Math.floor(Date.now() / 1000)
  };

  db.warnings.push(newWarn);
  db.save('warnings');
  return newWarn;
}

// Get all warnings for a user in a specific guild
function getWarnings(guildId, userId) {
  return db.warnings
    .filter(w => w.guildId === guildId && w.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

// Clear all warnings for a user in a guild
function clearWarnings(guildId, userId) {
  const beforeCount = db.warnings.length;
  const filtered = db.warnings.filter(w => !(w.guildId === guildId && w.userId === userId));
  const removed = beforeCount - filtered.length;

  db.warnings.length = 0;
  filtered.forEach(w => db.warnings.push(w));
  db.save('warnings');

  return removed;
}

module.exports = {
  addWarning,
  getWarnings,
  clearWarnings
};
