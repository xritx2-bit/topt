const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, formatDuration, randomInt } = require('../../utils/helpers');

const begScenarios = [
  'A friendly Wall Street trader tipped you some spare change: ',
  'A generous crypto whale dropped coins into your wallet: ',
  'You found some forgotten coins under the trading desk: ',
  'An angel investor decided to sponsor your coffee fund: ',
  'A fellow trader felt bad about your last trade and handed you: '
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beg')
    .setDescription('Ask for spare TOPT currency coins'),
  aliases: ['b'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'beg', config.economy.beg.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Please Wait',
        `⏳ People are tired of giving handouts right now! Come back in **${formatDuration(cooldown)}**.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const { payout, prefix } = processBeg(userId);
    const embed = economyEmbed('Handout Received', `🤲 ${prefix}**${formatCurrency(payout)}**!`);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'beg', config.economy.beg.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Please Wait',
        `⏳ People are tired of giving handouts right now! Come back in **${formatDuration(cooldown)}**.`
      );
      return message.reply({ embeds: [embed] });
    }

    const { payout, prefix } = processBeg(userId);
    const embed = economyEmbed('Handout Received', `🤲 ${prefix}**${formatCurrency(payout)}**!`);
    await message.reply({ embeds: [embed] });
  }
};

function processBeg(userId) {
  const payout = randomInt(config.economy.beg.min, config.economy.beg.max);
  economyDb.addWallet(userId, payout);
  economyDb.setCooldown(userId, 'beg');

  const prefix = begScenarios[randomInt(0, begScenarios.length - 1)];
  return { payout, prefix };
}
