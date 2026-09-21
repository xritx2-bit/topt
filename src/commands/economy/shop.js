const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { economyEmbed } = require('../../utils/embeds');
const { formatCurrency } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the TOPT items & upgrades black market'),
  aliases: ['store', 'market'],

  async executeSlash(interaction) {
    const embed = createShopEmbed();
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const embed = createShopEmbed();
    await message.reply({ embeds: [embed] });
  }
};

function createShopEmbed() {
  const embed = economyEmbed(
    'TOPT Trading Exchange & Shop',
    'Invest your TOPT currency into passive upgrades, gambling boosts, and prestigious trading badges!\n'
  );

  config.shopItems.forEach(item => {
    const roleText = item.roleName ? `\n> 🎭 **Grants Discord Role**: \`${item.roleName}\`` : '';
    embed.addFields({
      name: `${item.emoji} **${item.name}** — \`${formatCurrency(item.price)}\``,
      value: `> *${item.description}*${roleText}\n> **Item ID**: \`${item.id}\` • Purchase with: \`topt buy ${item.id}\`\n`,
      inline: false
    });
  });

  embed.setFooter({ text: 'Use `/buy <item_id>` or `topt buy <item_id>` to purchase items' });
  return embed;
}
