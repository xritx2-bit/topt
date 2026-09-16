const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount, randomInt } = require('../../utils/helpers');

const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll dice against the House for TOPT currency')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT to bet (e.g. 100, 1k, all, half)')
        .setRequired(true)
    ),
  aliases: ['roll', 'dices'],

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

    const result = playDice(userId, bet);
    const embed = createDiceEmbed(interaction.user, result);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const user = economyDb.getUser(userId);

    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt dice <amount>`\nExample: `topt dice 100` or `topt roll all`')]
      });
    }

    const amountInput = args[0];
    const bet = parseAmount(amountInput, user.wallet);

    if (!bet || bet <= 0) {
      return message.reply({
        embeds: [errorEmbed('Invalid Bet', 'Please provide a valid bet amount (e.g. `100`, `1k`, `half`, `all`).')]
      });
    }

    if (user.wallet < bet) {
      return message.reply({
        embeds: [errorEmbed('Insufficient Funds', `You only have **${formatCurrency(user.wallet)}** in your wallet!`)]
      });
    }

    const result = playDice(userId, bet);
    const embed = createDiceEmbed(message.author, result);
    await message.reply({ embeds: [embed] });
  }
};

function playDice(userId, bet) {
  const u1 = randomInt(1, 6);
  const u2 = randomInt(1, 6);
  const userTotal = u1 + u2;

  const b1 = randomInt(1, 6);
  const b2 = randomInt(1, 6);
  const botTotal = b1 + b2;

  const hasLuckyCoin = economyDb.hasItem(userId, 'lucky_coin');

  let status = 'loss';
  if (userTotal > botTotal) {
    status = 'win';
    economyDb.addWallet(userId, bet);
  } else if (userTotal === botTotal) {
    if (hasLuckyCoin) {
      // Lucky coin breaks ties in favor of user!
      status = 'lucky_tie_win';
      economyDb.addWallet(userId, bet);
    } else {
      status = 'tie'; // refund
    }
  } else {
    status = 'loss';
    economyDb.removeWallet(userId, bet);
  }

  const updatedUser = economyDb.getUser(userId);

  return {
    userRoll: [u1, u2],
    userTotal,
    botRoll: [b1, b2],
    botTotal,
    bet,
    status,
    hasLuckyCoin,
    newBalance: updatedUser.wallet
  };
}

function createDiceEmbed(user, result) {
  const [u1, u2] = result.userRoll;
  const [b1, b2] = result.botRoll;

  let title = 'Dice Duel Result';
  let color = config.colors.info;
  let statusText = '';

  if (result.status === 'win') {
    title = '🎉 You Won the Dice Duel!';
    color = config.colors.success;
    statusText = `🔥 **Victory!** You defeated the House and won **+${formatCurrency(result.bet)}**!`;
  } else if (result.status === 'lucky_tie_win') {
    title = '🍀 Lucky Coin Tie-Break Win!';
    color = config.colors.success;
    statusText = `✨ It was a tie, but your **Lucky Coin** broke the tie in your favor! You won **+${formatCurrency(result.bet)}**!`;
  } else if (result.status === 'tie') {
    title = '🤝 Dice Duel Tie (Push)';
    color = config.colors.gold;
    statusText = `⚖️ **It's a draw!** Your bet of **${formatCurrency(result.bet)}** was returned to your wallet.`;
  } else {
    title = '💸 The House Wins';
    color = config.colors.danger;
    statusText = `💀 **Defeat!** The House rolled higher. You lost **-${formatCurrency(result.bet)}**.`;
  }

  const desc = [
    `🎲 **Your Roll**: ${diceEmojis[u1]} ${diceEmojis[u2]} ➔ **Total: ${result.userTotal}**`,
    `🏦 **House Roll**: ${diceEmojis[b1]} ${diceEmojis[b2]} ➔ **Total: ${result.botTotal}**`,
    '',
    statusText,
    `💰 **Wallet Balance**: \`${formatCurrency(result.newBalance)}\``
  ].join('\n');

  return economyEmbed(title, desc)
    .setColor(color)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }));
}
