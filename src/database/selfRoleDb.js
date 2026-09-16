const db = require('./db');

// Register a button/menu customId with a Discord role ID
function registerSelfRole({ customId, guildId, messageId, roleId, label, emoji = null }) {
  db.selfroles[customId] = {
    customId,
    guildId,
    messageId,
    roleId,
    label,
    emoji,
    createdAt: Math.floor(Date.now() / 1000)
  };
  db.save('selfroles');
  return db.selfroles[customId];
}

// Retrieve role mapping for an interaction customId
function getSelfRole(customId) {
  return db.selfroles[customId] || null;
}

// Get all self roles for a guild
function getGuildSelfRoles(guildId) {
  return Object.values(db.selfroles).filter(sr => sr.guildId === guildId);
}

// Remove a self role mapping
function removeSelfRole(customId) {
  if (db.selfroles[customId]) {
    delete db.selfroles[customId];
    db.save('selfroles');
    return true;
  }
  return false;
}

module.exports = {
  registerSelfRole,
  getSelfRole,
  getGuildSelfRoles,
  removeSelfRole
};
