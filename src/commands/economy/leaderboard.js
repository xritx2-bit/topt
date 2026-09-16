const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const { economyEmbed } = require('../../utils/embeds');
const { formatCurrency, formatNumber } = require('../../utils/helpers');

const medalEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the wealthiest traders on the server'),
  aliases: ['top', 'lb', 'rich'],

  async executeSlash(interaction) {
    const embed = await createLeaderboardEmbed(interaction.client);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const embed = await createLeaderboardEmbed(message.client);
    await message.reply({ embeds: [embed] });
  }
};

async function createLeaderboardEmbed(client) {
  const topTraders = economyDb.getLeaderboard(10);

  const embed = economyEmbed(
    'Server Wealth & Net Worth Leaderboard',
    'The most successful traders ranked by total TOPT holdings (Wallet + Bank Vault):\n'
  );

  if (topTraders.length === 0) {
    embed.setDescription('No trading records registered yet. Start earning TOPT with `topt daily` and `topt work`!');
    return embed;
  }

  const lines = [];

  for (let i = 0; i < topTraders.length; i++) {
    const trader = topTraders[i];
    const medal = medalEmojis[i] || `#${i + 1}`;

    let username = `Trader (${trader.userId.slice(0, 4)}...)`;
    try {
      const userObj = await client.users.fetch(trader.userId);
      if (userObj) username = userObj.username;
    } catch {
      // fallback
    }

    const hasVip = economyDb.hasItem(trader.userId, 'vip_badge');
    const vipBadge = hasVip ? ' 💎' : '';

    lines.push(`${medal} **${username}**${vipBadge} — \`${formatCurrency(trader.totalNetWorth)}\``);
  }

  embed.setDescription(lines.join('\n\n'));
  embed.setFooter({ text: 'Compete for the top spot using /hunt, /work, and trading!' });

  return embed;
}
