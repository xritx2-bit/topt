const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase an item or upgrade from the TOPT shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('The ID of the item to purchase')
        .setRequired(true)
        .addChoices(
          ...config.shopItems.map(item => ({ name: `${item.name} (${item.price} TOPT)`, value: item.id }))
        )
    ),
  aliases: ['purchase'],

  async executeSlash(interaction) {
    const itemId = interaction.options.getString('item');
    const result = handlePurchase(interaction.user.id, itemId);

    if (!result.success) {
      return interaction.reply({ embeds: [errorEmbed('Purchase Failed', result.message)], ephemeral: true });
    }

    const embed = successEmbed(
      'Purchase Successful!',
      `🛍️ You acquired **${result.item.emoji} ${result.item.name}** for **${formatCurrency(result.item.price)}**!\n` +
      `✨ *Perk: ${result.item.description}*`
    );
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt buy <item_id>`\nRun `topt shop` to view all available items and their IDs.')]
      });
    }

    const itemId = args[0].toLowerCase();
    const result = handlePurchase(message.author.id, itemId);

    if (!result.success) {
      return message.reply({ embeds: [errorEmbed('Purchase Failed', result.message)] });
    }

    const embed = successEmbed(
      'Purchase Successful!',
      `🛍️ You acquired **${result.item.emoji} ${result.item.name}** for **${formatCurrency(result.item.price)}**!\n` +
      `✨ *Perk: ${result.item.description}*`
    );
    await message.reply({ embeds: [embed] });
  }
};

function handlePurchase(userId, itemId) {
  const item = config.shopItems.find(i => i.id === itemId);
  if (!item) {
    return { success: false, message: `Could not find an item with ID \`${itemId}\`. View available items with \`topt shop\`.` };
  }

  if (economyDb.hasItem(userId, item.id)) {
    return { success: false, message: `You already own **${item.emoji} ${item.name}**!` };
  }

  const user = economyDb.getUser(userId);
  if (user.wallet < item.price) {
    return {
      success: false,
      message: `You need **${formatCurrency(item.price)}** to buy this, but you only have **${formatCurrency(user.wallet)}** in your wallet!`
    };
  }

  economyDb.removeWallet(userId, item.price);
  economyDb.addItem(userId, item.id, 'shop', 1);

  return { success: true, item };
}
