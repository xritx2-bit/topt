const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency, formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell hunted commodities and assets for TOPT currency')
    .addStringOption(option =>
      option.setName('target')
        .setDescription('Item ID or "all" to liquidate all hunt collectibles')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Quantity to sell (ignored if selling "all")')
        .setRequired(false)
        .setMinValue(1)
    ),
  aliases: ['liquidate'],

  async executeSlash(interaction) {
    const target = interaction.options.getString('target').toLowerCase().trim();
    const qty = interaction.options.getInteger('quantity') || 1;

    const result = handleSell(interaction.user.id, target, qty);
    if (!result.success) {
      return interaction.reply({ embeds: [errorEmbed('Sale Failed', result.message)], ephemeral: true });
    }

    const embed = successEmbed('Assets Liquidated', result.message);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt sell <item_id|all> [quantity]`\nExample: `topt sell all` or `topt sell penny_stock 5`')]
      });
    }

    const target = args[0].toLowerCase().trim();
    const qty = args[1] ? parseInt(args[1], 10) || 1 : 1;

    const result = handleSell(message.author.id, target, qty);
    if (!result.success) {
      return message.reply({ embeds: [errorEmbed('Sale Failed', result.message)] });
    }

    const embed = successEmbed('Assets Liquidated', result.message);
    await message.reply({ embeds: [embed] });
  }
};

function handleSell(userId, target, qty) {
  const inv = economyDb.getInventory(userId);

  if (target === 'all') {
    let totalEarnings = 0;
    let itemsSold = 0;

    inv.forEach(item => {
      const asset = config.collectibles.find(c => c.id === item.itemId);
      if (asset && item.quantity > 0) {
        const itemVal = asset.sellPrice * item.quantity;
        totalEarnings += itemVal;
        itemsSold += item.quantity;
        economyDb.removeItem(userId, item.itemId, item.quantity);
      }
    });

    if (itemsSold === 0) {
      return { success: false, message: 'You have no sellable commodities in your inventory!' };
    }

    economyDb.addWallet(userId, totalEarnings);
    return {
      success: true,
      message: `💰 You sold **${formatNumber(itemsSold)}** commodities for a total of **${formatCurrency(totalEarnings)}**!`
    };
  }

  // Selling a specific item
  const asset = config.collectibles.find(c => c.id === target);
  if (!asset) {
    return { success: false, message: `Unknown asset \`${target}\`. You can only sell commodities from your inventory.` };
  }

  const owned = inv.find(i => i.itemId === asset.id);
  if (!owned || owned.quantity < qty) {
    return {
      success: false,
      message: `You do not have \`${qty}x\` of **${asset.name}** to sell! (You own: \`${owned ? owned.quantity : 0}\`)`
    };
  }

  const earnings = asset.sellPrice * qty;
  economyDb.removeItem(userId, asset.id, qty);
  economyDb.addWallet(userId, earnings);

  return {
    success: true,
    message: `💰 Sold \`${qty}x\` **${asset.emoji} ${asset.name}** for **${formatCurrency(earnings)}**!`
  };
}
