const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, formatDuration } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily TOPT currency dividend and maintain your streak!'),
  aliases: ['d'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'daily', config.economy.daily.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Daily Reward on Cooldown',
        `⏳ You have already claimed your daily dividend today!\nPlease check back in **${formatDuration(cooldown)}**.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const result = economyDb.claimDaily(userId);
    const embed = createDailyEmbed(interaction.user, result);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const cooldown = economyDb.getCooldownRemaining(userId, 'daily', config.economy.daily.cooldown);

    if (cooldown > 0) {
      const embed = errorEmbed(
        'Daily Reward on Cooldown',
        `⏳ You have already claimed your daily dividend today!\nPlease check back in **${formatDuration(cooldown)}**.`
      );
      return message.reply({ embeds: [embed] });
    }

    const result = economyDb.claimDaily(userId);
    const embed = createDailyEmbed(message.author, result);
    await message.reply({ embeds: [embed] });
  }
};

function createDailyEmbed(user, result) {
  let description = `🎉 You claimed your daily trading bonus of **${formatCurrency(result.reward)}**!\n`;
  description += `🔥 **Current Streak**: \`${result.streak} days\`\n`;
  if (result.isVip) {
    description += `💎 *VIP Perk Applied: +20% Bonus Included!*`;
  }

  return economyEmbed('Daily Dividend Received!', description)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Remember to return tomorrow to keep your streak alive!' });
}
