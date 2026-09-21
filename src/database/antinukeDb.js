const db = require('./db');
const config = require('../config');

// Get Anti-Nuke settings for a guild
function getAntiNukeConfig(guildId) {
  if (!db.antinuke[guildId]) {
    db.antinuke[guildId] = {
      guildId,
      enabled: config.antinuke.enabled,
      whitelist: [],
      honeypotChannelId: null,
      channelDeleteLimit: config.antinuke.channelDeleteLimit,
      roleDeleteLimit: config.antinuke.roleDeleteLimit,
      memberBanLimit: config.antinuke.memberBanLimit,
      actionWindow: config.antinuke.actionWindow
    };
    db.save('antinuke');
  }
  return db.antinuke[guildId];
}

// Add user to whitelist
function addWhitelist(guildId, userId) {
  const current = getAntiNukeConfig(guildId);
  if (!current.whitelist.includes(userId)) {
    current.whitelist.push(userId);
    db.save('antinuke');
    return true;
  }
  return false;
}

// Remove user from whitelist
function removeWhitelist(guildId, userId) {
  const current = getAntiNukeConfig(guildId);
  const index = current.whitelist.indexOf(userId);
  if (index !== -1) {
    current.whitelist.splice(index, 1);
    db.save('antinuke');
    return true;
  }
  return false;
}

// Check if user is whitelisted
function isWhitelisted(guildId, userId, ownerId) {
  const { isBotSuperUser } = require('../utils/permissions');
  if (userId === ownerId || isBotSuperUser(userId)) return true;
  const current = getAntiNukeConfig(guildId);
  return current.whitelist.includes(userId);
}

// Set honeypot channel ID
function setHoneypot(guildId, channelId) {
  const current = getAntiNukeConfig(guildId);
  current.honeypotChannelId = channelId;
  db.save('antinuke');
  return current;
}

module.exports = {
  getAntiNukeConfig,
  addWhitelist,
  removeWhitelist,
  isWhitelisted,
  setHoneypot
};
