const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const economyDb = require('../../database/economyDb');
const db = require('../../database/db');
const { checkAdminPermission } = require('../../utils/permissions');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Admin: Grant TOPT coins to a member (Admin / Bot Owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to receive coins')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT coins to credit (e.g. 1000, 50k, 1m)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('destination')
        .setDescription('Where to deposit the funds')
        .setRequired(false)
        .addChoices(
          { name: 'Wallet', value: 'wallet' },
          { name: 'Bank Vault', value: 'bank' }
        )
    ),
  aliases: ['givemoney', 'credit'],

  async executeSlash(interaction) {
    if (!checkAdminPermission(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'Only Server Administrators or Bot Owners can use this command.')],
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('target');
    const amountStr = interaction.options.getString('amount');
    const destination = interaction.options.getString('destination') || 'wallet';

    const amount = parseAmount(amountStr, 1000000000);
    if (!amount || amount <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid positive amount.')],
        ephemeral: true
      });
    }

    const userProfile = economyDb.getUser(target.id);
    if (destination === 'bank') {
      userProfile.bank = (userProfile.bank || 0) + amount;
      db.save('users');
    } else {
      economyDb.addWallet(target.id, amount);
    }

    const updated = economyDb.getUser(target.id);
    const embed = createAddMoneyEmbed(target, amount, destination, updated);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    if (!checkAdminPermission(message)) {
      return message.reply({
        embeds: [errorEmbed('Permission Denied', 'Only Server Administrators or Bot Owners can use this command.')]
      });
    }

    if (args.length < 2) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt addmoney @user <amount> [wallet|bank]`\nExample: `topt addmoney @member 50000` or `topt givemoney @member 100k bank`')]
      });
    }

    let target = message.mentions.users.first();
    let amountArg = args[1];
    let destArg = args[2]?.toLowerCase() || 'wallet';

    // If first argument is ID
    if (!target) {
      const cleanId = args[0].replace(/[<@!>]/g, '').trim();
      if (/^\d{17,20}$/.test(cleanId)) {
        target = await message.client.users.fetch(cleanId).catch(() => null);
      }
    }

    if (!target) {
      return message.reply({
        embeds: [errorEmbed('Target Required', 'Could not locate that member. Mention them or provide their Discord ID.')]
      });
    }

    const amount = parseAmount(amountArg, 1000000000);
    if (!amount || amount <= 0) {
      return message.reply({
        embeds: [errorEmbed('Invalid Amount', 'Please specify a valid positive number or shorthand (e.g. `50000`, `100k`).')]
      });
    }

    const userProfile = economyDb.getUser(target.id);
    if (destArg === 'bank') {
      userProfile.bank = (userProfile.bank || 0) + amount;
      db.save('users');
    } else {
      economyDb.addWallet(target.id, amount);
    }

    const updated = economyDb.getUser(target.id);
    const embed = createAddMoneyEmbed(target, amount, destArg === 'bank' ? 'bank' : 'wallet', updated);
    await message.reply({ embeds: [embed] });
  }
};

function createAddMoneyEmbed(target, amount, destination, profile) {
  const destName = destination === 'bank' ? 'Bank Vault' : 'Wallet';
  const total = (profile.wallet || 0) + (profile.bank || 0);

  return successEmbed(
    'Funds Credited',
    `💰 Successfully credited **${formatCurrency(amount)}** to **${target.username}**'s **${destName}**!`
  )
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🪙 Wallet', value: `\`${formatCurrency(profile.wallet)}\``, inline: true },
      { name: '🏦 Bank Vault', value: `\`${formatCurrency(profile.bank)}\``, inline: true },
      { name: '📊 Net Worth', value: `\`${formatCurrency(total)}\``, inline: true }
    );
}
