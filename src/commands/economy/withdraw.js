const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw TOPT coins from your secure Bank Vault into your wallet')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT coins to withdraw (e.g. 500, 1k, half, all, max)')
        .setRequired(true)
    ),
  aliases: ['with'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const profile = economyDb.getUser(userId);

    if (profile.bank <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Bank Vault Empty', 'You do not have any coins in your Bank Vault to withdraw!')],
        ephemeral: true
      });
    }

    const amountInput = interaction.options.getString('amount');
    const amount = parseAmount(amountInput, profile.bank);

    if (!amount || amount <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid withdrawal amount (e.g. `500`, `1k`, `half`, `all`).')],
        ephemeral: true
      });
    }

    if (profile.bank < amount) {
      return interaction.reply({
        embeds: [errorEmbed('Insufficient Bank Balance', `You only have **${formatCurrency(profile.bank)}** in your Bank Vault.`)],
        ephemeral: true
      });
    }

    const success = economyDb.withdraw(userId, amount);
    if (!success) {
      return interaction.reply({
        embeds: [errorEmbed('Withdrawal Failed', 'Could not complete the withdrawal transaction.')],
        ephemeral: true
      });
    }

    const updated = economyDb.getUser(userId);
    const embed = createWithdrawEmbed(interaction.user, amount, updated);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const profile = economyDb.getUser(userId);

    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt with <amount|all>`\nExample: `topt with 1000` or `topt with all`')]
      });
    }

    if (profile.bank <= 0) {
      return message.reply({
        embeds: [errorEmbed('Bank Vault Empty', 'You do not have any coins in your Bank Vault to withdraw!')]
      });
    }

    const amount = parseAmount(args[0], profile.bank);

    if (!amount || amount <= 0) {
      return message.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid withdrawal amount (e.g. `500`, `1k`, `half`, `all`).')]
      });
    }

    if (profile.bank < amount) {
      return message.reply({
        embeds: [errorEmbed('Insufficient Bank Balance', `You only have **${formatCurrency(profile.bank)}** in your Bank Vault.`)]
      });
    }

    const success = economyDb.withdraw(userId, amount);
    if (!success) {
      return message.reply({
        embeds: [errorEmbed('Withdrawal Failed', 'Could not complete the withdrawal transaction.')]
      });
    }

    const updated = economyDb.getUser(userId);
    const embed = createWithdrawEmbed(message.author, amount, updated);
    await message.reply({ embeds: [embed] });
  }
};

function createWithdrawEmbed(user, amount, profile) {
  const total = (profile.wallet || 0) + (profile.bank || 0);

  return successEmbed(
    'Bank Vault Withdrawal',
    `💸 Successfully withdrew **${formatCurrency(amount)}** into your wallet!\n⚠️ *Coins in your wallet can be snatched by other traders! Keep excess coins safe in \`/deposit\`.*`
  )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🪙 Wallet', value: `\`${formatCurrency(profile.wallet)}\``, inline: true },
      { name: '🏦 Bank Vault', value: `\`${formatCurrency(profile.bank)}\``, inline: true },
      { name: '📊 Net Worth', value: `\`${formatCurrency(total)}\``, inline: true }
    );
}
