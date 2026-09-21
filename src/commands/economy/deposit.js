const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit TOPT coins from your wallet into your secure Bank Vault')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT coins to deposit (e.g. 500, 1k, half, all, max)')
        .setRequired(true)
    ),
  aliases: ['dep'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const profile = economyDb.getUser(userId);

    if (profile.wallet <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Wallet Empty', 'You do not have any coins in your wallet to deposit!')],
        ephemeral: true
      });
    }

    const amountInput = interaction.options.getString('amount');
    const amount = parseAmount(amountInput, profile.wallet);

    if (!amount || amount <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid deposit amount (e.g. `500`, `1k`, `half`, `all`).')],
        ephemeral: true
      });
    }

    if (profile.wallet < amount) {
      return interaction.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(profile.wallet)}** in your wallet.`)],
        ephemeral: true
      });
    }

    const success = economyDb.deposit(userId, amount);
    if (!success) {
      return interaction.reply({
        embeds: [errorEmbed('Deposit Failed', 'Could not complete the deposit transaction.')],
        ephemeral: true
      });
    }

    const updated = economyDb.getUser(userId);
    const embed = createDepositEmbed(interaction.user, amount, updated);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const profile = economyDb.getUser(userId);

    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt dep <amount|all>`\nExample: `topt dep 1000` or `topt dep all`')]
      });
    }

    if (profile.wallet <= 0) {
      return message.reply({
        embeds: [errorEmbed('Wallet Empty', 'You do not have any coins in your wallet to deposit!')]
      });
    }

    const amount = parseAmount(args[0], profile.wallet);

    if (!amount || amount <= 0) {
      return message.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid deposit amount (e.g. `500`, `1k`, `half`, `all`).')]
      });
    }

    if (profile.wallet < amount) {
      return message.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(profile.wallet)}** in your wallet.`)]
      });
    }

    const success = economyDb.deposit(userId, amount);
    if (!success) {
      return message.reply({
        embeds: [errorEmbed('Deposit Failed', 'Could not complete the deposit transaction.')]
      });
    }

    const updated = economyDb.getUser(userId);
    const embed = createDepositEmbed(message.author, amount, updated);
    await message.reply({ embeds: [embed] });
  }
};

function createDepositEmbed(user, amount, profile) {
  const total = (profile.wallet || 0) + (profile.bank || 0);

  return successEmbed(
    'Bank Vault Deposit',
    `🏦 Successfully deposited **${formatCurrency(amount)}** into your Bank Vault!\n🛡️ *Funds in your Bank Vault are 100% immune to \`/snatch\`.*`
  )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🪙 Wallet', value: `\`${formatCurrency(profile.wallet)}\``, inline: true },
      { name: '🏦 Bank Vault', value: `\`${formatCurrency(profile.bank)}\``, inline: true },
      { name: '📊 Net Worth', value: `\`${formatCurrency(total)}\``, inline: true }
    );
}
