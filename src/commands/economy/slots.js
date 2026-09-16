const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed } = require('../../utils/embeds');
const { formatCurrency, parseAmount, randomInt } = require('../../utils/helpers');

const symbols = ['💎', '🪙', '🚀', '📈', '🍒', '🔔', '7️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the TOPT casino slot machine')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount of TOPT to bet (e.g. 100, 1k, all, half)')
        .setRequired(true)
    ),
  aliases: ['s', 'slot'],

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

    const result = spinSlots(userId, bet);
    const embed = createSlotsEmbed(interaction.user, result);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const userId = message.author.id;
    const user = economyDb.getUser(userId);

    if (args.length === 0) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt slots <amount>`\nExample: `topt slots 100` or `topt s all`')]
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

    const result = spinSlots(userId, bet);
    const embed = createSlotsEmbed(message.author, result);
    await message.reply({ embeds: [embed] });
  }
};

function spinSlots(userId, bet) {
  const s1 = symbols[randomInt(0, symbols.length - 1)];
  const s2 = symbols[randomInt(0, symbols.length - 1)];
  const s3 = symbols[randomInt(0, symbols.length - 1)];

  let multiplier = 0;
  let status = 'loss';

  // 3-match Jackpots
  if (s1 === s2 && s2 === s3) {
    if (s1 === '7️⃣' || s1 === '💎') {
      multiplier = 10;
      status = 'mega_jackpot';
    } else {
      multiplier = 5;
      status = 'triple_match';
    }
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    // 2-match minor win
    multiplier = 1.5;
    status = 'double_match';
  }

  const profit = Math.floor(bet * multiplier);

  if (multiplier > 0) {
    const netWin = profit - bet;
    economyDb.addWallet(userId, netWin);
  } else {
    economyDb.removeWallet(userId, bet);
  }

  const updatedUser = economyDb.getUser(userId);

  return {
    reels: [s1, s2, s3],
    multiplier,
    profit,
    bet,
    status,
    newBalance: updatedUser.wallet
  };
}

function createSlotsEmbed(user, result) {
  const [s1, s2, s3] = result.reels;

  let title = 'TOPT High Roller Slot Machine';
  let color = config.colors.gold;
  let messageText = '';

  if (result.status === 'mega_jackpot') {
    title = '🚨 ULTRA JACKPOT 10X WINNER! 🚨';
    color = config.colors.gold;
    messageText = `🎉 **INSANE JACKPOT!** You won **+${formatCurrency(result.profit)}**!`;
  } else if (result.status === 'triple_match') {
    title = '🎉 TRIPLE MATCH 5X WINNER! 🎉';
    color = config.colors.success;
    messageText = `✨ **Triple Match!** You won **+${formatCurrency(result.profit)}**!`;
  } else if (result.status === 'double_match') {
    title = '✨ Two-of-a-Kind Win (1.5x)';
    color = config.colors.success;
    messageText = `👍 **Double match!** You won **+${formatCurrency(result.profit)}**!`;
  } else {
    title = 'Slots - Better Luck Next Time';
    color = config.colors.danger;
    messageText = `💸 No matching lines. You lost **-${formatCurrency(result.bet)}**.`;
  }

  const slotBoard = [
    '```',
    '╔═════════════════╗',
    `║   ${s1}  |  ${s2}  |  ${s3}   ║  ◄◄`,
    '╚═════════════════╝',
    '```'
  ].join('\n');

  const desc = `${slotBoard}\n${messageText}\n💰 **New Wallet Balance**: \`${formatCurrency(result.newBalance)}\``;

  return economyEmbed(title, desc)
    .setColor(color)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }));
}
