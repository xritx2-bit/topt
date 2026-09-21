const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const { economyEmbed } = require('../../utils/embeds');
const { formatCurrency, formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or another user\'s TOPT currency balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose balance you want to view')
        .setRequired(false)
    ),
  aliases: ['bal', 'cash', 'money'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const profile = economyDb.getUser(targetUser.id);
    const hasVip = economyDb.hasItem(targetUser.id, 'vip_badge');

    const embed = createBalanceEmbed(targetUser, profile, hasVip);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    const profile = economyDb.getUser(targetUser.id);
    const hasVip = economyDb.hasItem(targetUser.id, 'vip_badge');

    const embed = createBalanceEmbed(targetUser, profile, hasVip);
    await message.reply({ embeds: [embed] });
  }
};

function createBalanceEmbed(user, profile, hasVip) {
  const total = (profile.wallet || 0) + (profile.bank || 0);

  return economyEmbed(
    `${user.username}'s Financial Portfolio`,
    hasVip ? '💎 **VIP Trader Status Active** (20% Daily Bonus)' : '💼 **Standard Trader Account**'
  )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🪙 Wallet', value: `\`${formatCurrency(profile.wallet)}\``, inline: true },
      { name: '🏦 Bank Vault', value: `\`${formatCurrency(profile.bank)}\``, inline: true },
      { name: '📊 Net Worth', value: `\`${formatCurrency(total)}\``, inline: true },
      { name: '🔥 Daily Streak', value: `\`${profile.dailyStreak || 0} days\``, inline: true }
    )
    .setFooter({ text: '🏦 Bank funds are 100% immune to /snatch • Use /deposit & /withdraw' });
}
