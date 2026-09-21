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
        .setDescription('The item to purchase (select from list, or leave empty to view shop)')
        .setRequired(false)
        .addChoices(
          ...config.shopItems.map(item => ({ name: `${item.name} (${item.price.toLocaleString()} TOPT)`, value: item.id }))
        )
    ),
  aliases: ['purchase'],

  async executeSlash(interaction) {
    const itemId = interaction.options.getString('item');

    // If no item selected, show the interactive shop embed with components
    if (!itemId) {
      const { createShopEmbed, createShopComponents } = require('./shop');
      return interaction.reply({
        embeds: [createShopEmbed()],
        components: createShopComponents()
      });
    }

    const item = resolveItem(itemId);
    if (!item) {
      return interaction.reply({
        embeds: [errorEmbed('Item Not Found', `Could not find an item matching \`${itemId}\`. View the shop with \`/shop\`.`)],
        ephemeral: true
      });
    }

    const result = handlePurchase(interaction.user.id, item.id);
    if (!result.success) {
      return interaction.reply({ embeds: [errorEmbed('Purchase Failed', result.message)], ephemeral: true });
    }

    let roleNotice = '';
    if (interaction.guild && result.item.roleName) {
      const { assignShopRole } = require('../../utils/shopRoles');
      const roleResult = await assignShopRole(interaction.guild, interaction.member, result.item);
      if (roleResult.assigned && roleResult.role) {
        roleNotice = `\n🎭 **Discord Role**: <@&${roleResult.role.id}> has been granted to your server profile!`;
      }
    }

    const embed = successEmbed(
      'Purchase Successful!',
      `🛍️ You acquired **${result.item.emoji} ${result.item.name}** for **${formatCurrency(result.item.price)}**!\n` +
      `✨ *Perk: ${result.item.description}*${roleNotice}`
    );
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    // If user types 'topt buy' without specifying an item, show interactive embed
    if (args.length === 0) {
      const { createShopEmbed, createShopComponents } = require('./shop');
      return message.reply({
        embeds: [createShopEmbed()],
        components: createShopComponents()
      });
    }

    const input = args.join(' ').toLowerCase();
    const item = resolveItem(input);

    if (!item) {
      const { createShopEmbed, createShopComponents } = require('./shop');
      return message.reply({
        embeds: [
          errorEmbed(
            'Item Not Found',
            `Could not find an item matching \`${input}\`.\n` +
            `Choose an item from the interactive shop below, or use \`topt buy 1\`, \`topt buy 2\`, etc.:`
          ),
          createShopEmbed()
        ],
        components: createShopComponents()
      });
    }

    const result = handlePurchase(message.author.id, item.id);
    if (!result.success) {
      return message.reply({ embeds: [errorEmbed('Purchase Failed', result.message)] });
    }

    let roleNotice = '';
    if (message.guild && result.item.roleName) {
      const { assignShopRole } = require('../../utils/shopRoles');
      const roleResult = await assignShopRole(message.guild, message.member, result.item);
      if (roleResult.assigned && roleResult.role) {
        roleNotice = `\n🎭 **Discord Role**: <@&${roleResult.role.id}> has been granted to your server profile!`;
      }
    }

    const embed = successEmbed(
      'Purchase Successful!',
      `🛍️ You acquired **${result.item.emoji} ${result.item.name}** for **${formatCurrency(result.item.price)}**!\n` +
      `✨ *Perk: ${result.item.description}*${roleNotice}`
    );
    await message.reply({ embeds: [embed] });
  },

  handlePurchase,
  resolveItem,
  processShopPurchase
};

function resolveItem(input) {
  if (!input) return null;
  const str = input.toLowerCase().trim();

  // 1. Direct ID match (e.g. lucky_coin, vip_badge)
  let found = config.shopItems.find(i => i.id.toLowerCase() === str);
  if (found) return found;

  // 2. Number index match (e.g. 1 -> item #1, 2 -> item #2)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= config.shopItems.length) {
    return config.shopItems[num - 1];
  }

  // 3. Name or keyword match (e.g. "lucky", "license", "lens", "vip", "surveyor")
  found = config.shopItems.find(i =>
    i.name.toLowerCase().includes(str) ||
    str.includes(i.name.toLowerCase()) ||
    i.id.toLowerCase().includes(str) ||
    str.includes(i.id.toLowerCase())
  );
  if (found) return found;

  return null;
}

function handlePurchase(userId, itemId) {
  const item = config.shopItems.find(i => i.id === itemId);
  if (!item) {
    return { success: false, message: `Could not find an item with ID \`${itemId}\`. View available items with \`topt shop\`.` };
  }

  if (economyDb.hasItem(userId, item.id)) {
    return { success: false, message: `You already own **${item.emoji} ${item.name}**!` };
  }

  const user = economyDb.getUser(userId);
  if ((user.wallet || 0) < item.price) {
    return {
      success: false,
      message: `You need **${formatCurrency(item.price)}** to buy this, but you only have **${formatCurrency(user.wallet || 0)}** in your wallet!\n*(Tip: If your coins are in your bank, use \`/withdraw\` first)*`
    };
  }

  economyDb.removeWallet(userId, item.price);
  economyDb.addItem(userId, item.id, 'shop', 1);

  return { success: true, item };
}

async function processShopPurchase(interaction, itemId) {
  const result = handlePurchase(interaction.user.id, itemId);

  if (!result.success) {
    return interaction.reply({
      embeds: [errorEmbed('Purchase Failed', result.message)],
      ephemeral: true
    });
  }

  let roleNotice = '';
  if (interaction.guild && result.item.roleName) {
    try {
      const { assignShopRole } = require('../../utils/shopRoles');
      const roleResult = await assignShopRole(interaction.guild, interaction.member, result.item);
      if (roleResult && roleResult.assigned && roleResult.role) {
        roleNotice = `\n🎭 **Discord Role**: <@&${roleResult.role.id}> has been granted to your server profile!`;
      }
    } catch (err) {
      console.warn('[Shop Role Error]', err.message);
    }
  }

  const embed = successEmbed(
    'Purchase Successful!',
    `🛍️ You acquired **${result.item.emoji} ${result.item.name}** for **${formatCurrency(result.item.price)}**!\n` +
    `✨ *Perk: ${result.item.description}*${roleNotice}`
  );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
