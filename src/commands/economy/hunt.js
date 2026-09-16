const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { huntEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, formatDuration, rollHuntCollectible } = require('../../utils/helpers');

const rarityColors = {
  Common: 0x95A5A6,
  Uncommon: 0x2ECC71,
  Rare: 0x3498DB,
  Epic: 0x9B59B6,
  Legendary: 0xF1C40F,
  Mythic: 0xE74C3C
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Hunt for rare trading assets, commodities, and creatures (OwO-style)!'),
  aliases: ['h', 'catch'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'hunt', config.economy.hunt.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Scouting in Progress',
        `⏳ Your scouts are still exploring the market! Try again in **${formatDuration(cooldown)}**.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const { foundItem, totalOwned, hasScope } = processHunt(userId);
    const embed = createHuntEmbed(interaction.user, foundItem, totalOwned, hasScope);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'hunt', config.economy.hunt.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Scouting in Progress',
        `⏳ Your scouts are still exploring the market! Try again in **${formatDuration(cooldown)}**.`
      );
      return message.reply({ embeds: [embed] });
    }

    const { foundItem, totalOwned, hasScope } = processHunt(userId);
    const embed = createHuntEmbed(message.author, foundItem, totalOwned, hasScope);
    await message.reply({ embeds: [embed] });
  }
};

function processHunt(userId) {
  const hasScope = economyDb.hasItem(userId, 'hunter_scope');
  const foundItem = rollHuntCollectible(hasScope);

  economyDb.addItem(userId, foundItem.id, 'asset', 1);
  economyDb.setCooldown(userId, 'hunt');

  const inv = economyDb.getInventory(userId);
  const matched = inv.find(i => i.itemId === foundItem.id);
  const totalOwned = matched ? matched.quantity : 1;

  return { foundItem, totalOwned, hasScope };
}

function createHuntEmbed(user, item, totalOwned, hasScope) {
  const embed = huntEmbed(
    'Market Expedition Result!',
    `🎒 **${user.username}** went on a trading expedition and discovered:`
  );

  embed.setColor(rarityColors[item.rarity] || 0x9B59B6);

  let desc = `### ${item.emoji} **${item.name}**\n`;
  desc += `⭐ **Rarity**: \`[${item.rarity.toUpperCase()}]\`\n`;
  desc += `💰 **Liquidation Value**: \`${formatCurrency(item.sellPrice)}\`\n`;
  desc += `📦 **You now own**: \`${totalOwned}x\` in your inventory\n`;

  if (hasScope) {
    desc += `\n🔭 *Surveyor's Lens active: Higher rare drop rate applied!*`;
  }

  embed.setDescription(desc);
  embed.setFooter({ text: 'Use `topt sell` or `/sell` to liquidate assets for TOPT coins' });

  return embed;
}
