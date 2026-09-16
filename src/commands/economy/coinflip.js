const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Bet TOPT currency on a 50/50 coin flip')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT to gamble (e.g. 100, 1k, all, half)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Heads or Tails')
        .setRequired(false)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' }
        )
    ),
  aliases: ['cf', 'flip'],

  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const user = economyDb.getUser(userId);

    const amountInput = interaction.options.getString('amount');
    const bet = parseAmount(amountInput, user.wallet);

    if (!bet || bet <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Bet', 'Please enter a valid positive number, `half`, or `all`.')],
        ephemeral: true
      });
    }

    if (user.wallet < bet) {
      return interaction.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(user.wallet)}** in your wallet!`)],
        ephemeral: true
      });
    }

    const choice = interaction.options.getString('choice') || 'heads';
    const result = playCoinflip(userId, bet, choice);
    const embed = createCoinflipEmbed(interaction.user, result);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const user = economyDb.getUser(userId);

    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt cf <amount> [heads|tails]`\nExample: `topt cf 100 h` or `topt cf all`')]
      });
    }

    const amountInput = args[0];
    const bet = parseAmount(amountInput, user.wallet);

    if (!bet || bet <= 0) {
      return message.reply({
        embeds: [errorEmbed('Invalid Bet', 'Please provide a valid bet amount (e.g., `100`, `1k`, `half`, `all`).')]
      });
    }

    if (user.wallet < bet) {
      return message.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(user.wallet)}** in your wallet!`)]
      });
    }

    let choice = 'heads';
    if (args[1]) {
      const c = args[1].toLowerCase();
      if (c === 't' || c === 'tails' || c === 'tail') choice = 'tails';
    }

    const result = playCoinflip(userId, bet, choice);
    const embed = createCoinflipEmbed(message.author, result);
    await message.reply({ embeds: [embed] });
  }
};

function playCoinflip(userId, bet, userChoice) {
  const hasLuckyCoin = economyDb.hasItem(userId, 'lucky_coin');
  // Base win chance is 50%, with lucky coin it is 55%
  const winProbability = hasLuckyCoin ? 0.55 : 0.50;
  const isWin = Math.random() < winProbability;

  // If user wins, coin lands on their choice; if loss, coin lands on opposite
  let outcome = userChoice;
  if (!isWin) {
    outcome = userChoice === 'heads' ? 'tails' : 'heads';
  }

  if (isWin) {
    economyDb.addWallet(userId, bet);
  } else {
    economyDb.removeWallet(userId, bet);
  }

  const updatedUser = economyDb.getUser(userId);

  return {
    bet,
    userChoice,
    outcome,
    isWin,
    hasLuckyCoin,
    newBalance: updatedUser.wallet
  };
}

function createCoinflipEmbed(user, result) {
  const outcomeEmoji = result.outcome === 'heads' ? '🪙 (Heads)' : '🪙 (Tails)';

  if (result.isWin) {
    let desc = `The coin landed on **${outcomeEmoji}**!\n`;
    desc += `🎉 **You won +${formatCurrency(result.bet)}!**\n`;
    desc += `💰 **New Balance**: \`${formatCurrency(result.newBalance)}\``;
    if (result.hasLuckyCoin) {
      desc += `\n🍀 *Lucky Coin active (+5% probability boost)*`;
    }

    return economyEmbed('Coinflip Winner!', desc)
      .setColor(config.colors.success)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));
  } else {
    let desc = `The coin landed on **${outcomeEmoji}**.\n`;
    desc += `💸 **You lost -${formatCurrency(result.bet)}**.\n`;
    desc += `💰 **New Balance**: \`${formatCurrency(result.newBalance)}\``;

    return economyEmbed('Coinflip Lost', desc)
      .setColor(config.colors.danger)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));
  }
}
