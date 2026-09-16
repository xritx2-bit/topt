const db = require('./db');
const config = require('../config');

// Get AutoMod configuration for a guild
function getAutoModConfig(guildId) {
  if (!db.automod[guildId]) {
    db.automod[guildId] = {
      guildId,
      antiInvite: config.automod.antiInvite,
      antiLink: config.automod.antiLink,
      antiSpam: config.automod.antiSpam,
      maxMentions: config.automod.maxMentions,
      bannedWords: [...config.automod.bannedWords],
      logChannelId: null
    };
    db.save('automod');
  }
  return db.automod[guildId];
}

// Update specific AutoMod toggle
function updateAutoModConfig(guildId, key, value) {
  const current = getAutoModConfig(guildId);
  current[key] = value;
  db.save('automod');
  return current;
}

// Add a word to the guild's blacklist
function addBannedWord(guildId, word) {
  const current = getAutoModConfig(guildId);
  const cleanWord = word.toLowerCase().trim();
  if (!current.bannedWords.includes(cleanWord)) {
    current.bannedWords.push(cleanWord);
    db.save('automod');
    return true;
  }
  return false;
}

// Remove a word from the blacklist
function removeBannedWord(guildId, word) {
  const current = getAutoModConfig(guildId);
  const cleanWord = word.toLowerCase().trim();
  const index = current.bannedWords.indexOf(cleanWord);
  if (index !== -1) {
    current.bannedWords.splice(index, 1);
    db.save('automod');
    return true;
  }
  return false;
}

module.exports = {
  getAutoModConfig,
  updateAutoModConfig,
  addBannedWord,
  removeBannedWord
};
