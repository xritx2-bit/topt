const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { economyEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands and how to play with TOPT currency'),
  aliases: ['commands', 'info'],

  async executeSlash(interaction) {
    const embed = createHelpEmbed();
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const embed = createHelpEmbed();
    await message.reply({ embeds: [embed] });
  }
};

function createHelpEmbed() {
  const p = config.prefix;

  return economyEmbed(
    `${config.botName || 'TOPT ENGINE'} • Command Handbook`,
    `Welcome to the trading server companion! You can execute commands via Discord **Slash Commands (\`/\`)** or fast **Text Prefixes (\`${p} <cmd>\` or \`t <cmd>\`)** just like OwO bot!\n`
  )
    .addFields(
      {
        name: '🪙 TOPT Currency & OwO-Style Games',
        value: [
          `• \`${p} cash\` / \`/balance [user]\` — View wallet, bank, and net worth`,
          `• \`${p} daily\` / \`/daily\` — Claim daily dividend & build your streak`,
          `• \`${p} work\` / \`/work\` — Execute trading shifts for salary`,
          `• \`${p} beg\` / \`/beg\` — Collect spare coins from crypto whales`,
          `• \`${p} hunt\` / \`/hunt\` — Hunt rare trading commodities & creatures`,
          `• \`${p} cf <amt> [h/t]\` / \`/coinflip\` — 50/50 double-or-nothing coin flip`,
          `• \`${p} slots <amt>\` / \`/slots\` — Spin the 3-reel casino slot machine`,
          `• \`${p} dice <amt>\` / \`/dice\` — Roll dice duel against the House`,
          `• \`${p} shop\` / \`/shop\` — Browse perks, licenses & VIP badges`,
          `• \`${p} buy <id>\` / \`/buy\` — Purchase item upgrades`,
          `• \`${p} inv\` / \`/inventory\` — Check your owned assets & perks`,
          `• \`${p} sell <id|all>\` / \`/sell\` — Liquidate assets for TOPT coins`,
          `• \`${p} pay @user <amt>\` / \`/pay\` — Secure peer-to-peer transfer`,
          `• \`${p} top\` / \`/leaderboard\` — Server wealth leaderboard`
        ].join('\n'),
        inline: false
      },
      {
        name: '🤝 Trading Reputation & Vouches',
        value: [
          `• \`/vouch @trader <+1|-1> <comment>\` — Leave verified trade reputation`,
          `• \`/rep [@trader]\` — View a trader's trust score and reviews`,
          `• \`/scamreport @suspect <details>\` — File an urgent dispute/scam warning`
        ].join('\n'),
        inline: false
      },
      {
        name: '🛡️ Server Management & Moderation',
        value: [
          `• \`/kick @member [reason]\` — Kick a member`,
          `• \`/ban @user [reason]\` — Ban a user`,
          `• \`/timeout @member <minutes>\` — Temporarily mute a member`,
          `• \`/clear <1-100> [user]\` — Bulk delete messages`,
          `• \`/lock\` & \`/unlock\` — Emergency lockdown for trading channels`,
          `• \`/userinfo [user]\` — Inspect member identity & trading credentials`,
          `• \`/serverinfo\` — Server statistics and details`
        ].join('\n'),
        inline: false
      },
      {
        name: '🎭 Interactive Self Roles',
        value: [
          `• \`/selfroles panel\` — Create a customized button-based self-role embed for your members`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: `Type ${p} <command> or /<command> to begin!` });
}
