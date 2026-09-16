const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const { economyEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer TOPT currency to another server member')
    .addUserOption(option =>
      option.setName('recipient')
        .setDescription('The member to send TOPT coins to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT coins to transfer (e.g. 500, 1k, all)')
        .setRequired(true)
    ),
  aliases: ['give', 'transfer', 'send'],

  async executeSlash(interaction) {
    const senderId = interaction.user.id;
    const recipient = interaction.options.getUser('recipient');

    if (recipient.id === senderId) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Transfer', 'You cannot transfer money to yourself!')],
        ephemeral: true
      });
    }

    if (recipient.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Transfer', 'You cannot transfer money to bot accounts!')],
        ephemeral: true
      });
    }

    const senderProfile = economyDb.getUser(senderId);
    const amountInput = interaction.options.getString('amount');
    const amount = parseAmount(amountInput, senderProfile.wallet);

    if (!amount || amount <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid positive transfer amount.')],
        ephemeral: true
      });
    }

    if (senderProfile.wallet < amount) {
      return interaction.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(senderProfile.wallet)}** in your wallet.`)],
        ephemeral: true
      });
    }

    economyDb.transfer(senderId, recipient.id, amount);

    const embed = successEmbed(
      'Payment Successful',
      `💸 **${interaction.user.username}** transferred **${formatCurrency(amount)}** to **${recipient.username}**!`
    );
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const senderId = message.author.id;
    const recipient = message.mentions.users.first();

    if (!recipient) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt pay @user <amount>`\nExample: `topt pay @trader 1000`')]
      });
    }

    if (recipient.id === senderId) {
      return message.reply({
        embeds: [errorEmbed('Invalid Transfer', 'You cannot transfer money to yourself!')]
      });
    }

    if (recipient.bot) {
      return message.reply({
        embeds: [errorEmbed('Invalid Transfer', 'You cannot transfer money to bot accounts!')]
      });
    }

    // Find amount argument (argument that is not the mention)
    const amountArg = args.find(a => !a.startsWith('<@'));
    const senderProfile = economyDb.getUser(senderId);
    const amount = parseAmount(amountArg, senderProfile.wallet);

    if (!amount || amount <= 0) {
      return message.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid positive transfer amount.')]
      });
    }

    if (senderProfile.wallet < amount) {
      return message.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(senderProfile.wallet)}** in your wallet.`)]
      });
    }

    economyDb.transfer(senderId, recipient.id, amount);

    const embed = successEmbed(
      'Payment Successful',
      `💸 **${message.author.username}** transferred **${formatCurrency(amount)}** to **${recipient.username}**!`
    );
    await message.reply({ embeds: [embed] });
  }
};
