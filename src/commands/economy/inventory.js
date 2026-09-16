const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed } = require('../../utils/embeds');
const { formatCurrency, formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your or another trader\'s asset inventory and perks')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose inventory you want to view')
        .setRequired(false)
    ),
  aliases: ['inv', 'bag', 'assets'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const embed = createInventoryEmbed(targetUser);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    const embed = createInventoryEmbed(targetUser);
    await message.reply({ embeds: [embed] });
  }
};

function createInventoryEmbed(user) {
  const inv = economyDb.getInventory(user.id);

  const perks = [];
  const assets = [];
  let totalAssetValue = 0;

  inv.forEach(item => {
    // Check if it's a shop item
    const shopItem = config.shopItems.find(s => s.id === item.itemId);
    if (shopItem) {
      perks.push(`${shopItem.emoji} **${shopItem.name}** (\`x${item.quantity}\`)`);
      return;
    }

    // Check if it's a collectible/hunt asset
    const asset = config.collectibles.find(c => c.id === item.itemId);
    if (asset) {
      const itemVal = asset.sellPrice * item.quantity;
      totalAssetValue += itemVal;
      assets.push(`${asset.emoji} **${asset.name}** \`x${item.quantity}\` — ~${formatCurrency(itemVal)}`);
    }
  });

  const embed = economyEmbed(
    `${user.username}'s Trading Vault & Inventory`,
    `💼 **Total Inventory Asset Value**: \`${formatCurrency(totalAssetValue)}\``
  ).setThumbnail(user.displayAvatarURL({ dynamic: true }));

  if (perks.length > 0) {
    embed.addFields({
      name: '🎖️ Active Trader Perks & Licenses',
      value: perks.join('\n'),
      inline: false
    });
  } else {
    embed.addFields({
      name: '🎖️ Active Trader Perks & Licenses',
      value: '*No perks owned yet. Visit the `/shop` to purchase upgrades!*',
      inline: false
    });
  }

  if (assets.length > 0) {
    // Split into chunks if long
    embed.addFields({
      name: '📦 Owned Commodities & Rare Assets',
      value: assets.slice(0, 15).join('\n') + (assets.length > 15 ? `\n*...and ${assets.length - 15} more items*` : ''),
      inline: false
    });
  } else {
    embed.addFields({
      name: '📦 Owned Commodities & Rare Assets',
      value: '*No assets found. Use `/hunt` or `topt hunt` to start scouting the market!*',
      inline: false
    });
  }

  embed.setFooter({ text: 'Liquidate assets with `topt sell <item_id|all>` or `/sell`' });
  return embed;
}
