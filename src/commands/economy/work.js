const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, formatDuration, randomInt } = require('../../utils/helpers');

const workScenarios = [
  'executed high-frequency arbitrage trades across multiple exchanges',
  'analyzed quarterly earnings reports for an institutional hedge fund',
  'provided liquidity to a high-volume decentralized trading pool',
  'closed a profitable swing trade on tech equities',
  'brokered an over-the-counter (OTC) whale transaction',
  'spotted an undervalued crypto breakout and rode the momentum wave',
  'rebalanced the server trading portfolio with risk management precision'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Complete a trading shift to earn TOPT currency'),
  aliases: ['w', 'job'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'work', config.economy.work.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Take a Breather!',
        `⏳ You must rest between trading shifts. Return in **${formatDuration(cooldown)}**.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const { payout, scenario, hasLicense } = processWork(userId);
    const embed = createWorkEmbed(interaction.user, payout, scenario, hasLicense);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'work', config.economy.work.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Take a Breather!',
        `⏳ You must rest between trading shifts. Return in **${formatDuration(cooldown)}**.`
      );
      return message.reply({ embeds: [embed] });
    }

    const { payout, scenario, hasLicense } = processWork(userId);
    const embed = createWorkEmbed(message.author, payout, scenario, hasLicense);
    await message.reply({ embeds: [embed] });
  }
};

function processWork(userId) {
  let payout = randomInt(config.economy.work.min, config.economy.work.max);
  const hasLicense = economyDb.hasItem(userId, 'trader_license');

  if (hasLicense) {
    payout = Math.floor(payout * 1.30); // 30% broker license bonus
  }

  economyDb.addWallet(userId, payout);
  economyDb.setCooldown(userId, 'work');

  const scenario = workScenarios[randomInt(0, workScenarios.length - 1)];
  return { payout, scenario, hasLicense };
}

function createWorkEmbed(user, payout, scenario, hasLicense) {
  let text = `💼 You ${scenario} and made **${formatCurrency(payout)}**!`;
  if (hasLicense) {
    text += `\n📜 *Broker's License Perk: +30% bonus salary added!*`;
  }

  return economyEmbed('Trading Shift Completed', text)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }));
}
