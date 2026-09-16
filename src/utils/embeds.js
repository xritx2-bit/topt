const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Base branded embed
function baseEmbed() {
  return new EmbedBuilder()
    .setFooter({ text: `${config.botName || 'TOPT ENGINE'} • Powered by TOPT Currency` })
    .setTimestamp();
}

// Success Embed (Green)
function successEmbed(title, description) {
  return baseEmbed()
    .setColor(config.colors.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

// Error Embed (Red)
function errorEmbed(title, description) {
  return baseEmbed()
    .setColor(config.colors.danger)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

// Economy / Currency Embed (Gold)
function economyEmbed(title, description) {
  return baseEmbed()
    .setColor(config.colors.gold)
    .setTitle(`🪙 ${title}`)
    .setDescription(description);
}

// Info / Trading Embed (Blurple / Blue)
function infoEmbed(title, description) {
  return baseEmbed()
    .setColor(config.colors.info)
    .setTitle(`📈 ${title}`)
    .setDescription(description);
}

// Hunt / Collectible Embed (Purple / Rare)
function huntEmbed(title, description) {
  return baseEmbed()
    .setColor(config.colors.purple)
    .setTitle(`🎯 ${title}`)
    .setDescription(description);
}

module.exports = {
  baseEmbed,
  successEmbed,
  errorEmbed,
  economyEmbed,
  infoEmbed,
  huntEmbed
};
