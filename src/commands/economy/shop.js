const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const config = require('../../config');
const { economyEmbed } = require('../../utils/embeds');
const { formatCurrency } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the TOPT items & upgrades black market'),
  aliases: ['store', 'market'],

  async executeSlash(interaction) {
    await interaction.reply({
      embeds: [createShopEmbed()],
      components: createShopComponents()
    });
  },

  async executePrefix(message, args) {
    await message.reply({
      embeds: [createShopEmbed()],
      components: createShopComponents()
    });
  },

  createShopEmbed,
  createShopComponents
};

function createShopEmbed() {
  const embed = economyEmbed(
    'TOPT Trading Exchange & Shop',
    'Invest your TOPT currency into passive upgrades, gambling boosts, and prestigious trading badges!\n\n' +
    '🛒 **Interactive Purchase Options:**\n' +
    '• Select any item from the **dropdown menu** below\n' +
    '• Or click a **quick-buy button**\n' +
    '• Or type `topt buy <#|name>` (e.g. `topt buy 1` or `topt buy vip`)\n'
  );

  config.shopItems.forEach((item, index) => {
    const roleText = item.roleName ? `\n> 🎭 **Grants Discord Role**: \`${item.roleName}\`` : '';
    embed.addFields({
      name: `#${index + 1} • ${item.emoji} **${item.name}** — \`${formatCurrency(item.price)}\``,
      value: `> *${item.description}*${roleText}\n> **Quick Buy**: \`topt buy ${index + 1}\` or click button below\n`,
      inline: false
    });
  });

  embed.setFooter({ text: '💡 Click any button or select from the dropdown below to purchase!' });
  return embed;
}

function createShopComponents() {
  // 1. Select Menu Dropdown
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('shop_select_buy')
    .setPlaceholder('🛒 Select an item to purchase...')
    .addOptions(
      config.shopItems.map((item, idx) => ({
        label: `${idx + 1}. ${item.name} (${item.price.toLocaleString()} TOPT)`,
        description: item.description.slice(0, 100),
        value: item.id,
        emoji: item.emoji
      }))
    );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  // 2. Buttons Row
  const buttonRow = new ActionRowBuilder().addComponents(
    config.shopItems.map((item, idx) =>
      new ButtonBuilder()
        .setCustomId(`shop_buy_${item.id}`)
        .setLabel(`#${idx + 1} ${item.name.split(' ')[0]}`)
        .setEmoji(item.emoji)
        .setStyle(item.id === 'vip_badge' ? ButtonStyle.Success : ButtonStyle.Primary)
    )
  );

  return [selectRow, buttonRow];
}
