const { SlashCommandBuilder } = require('discord.js');
const repDb = require('../../database/repDb');
const { infoEmbed } = require('../../utils/embeds');
const { createProgressBar } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Check the trading reputation and vouches of a server member')
    .addUserOption(option =>
      option.setName('trader')
        .setDescription('The trader to check')
        .setRequired(false)
    ),
  aliases: ['reputation', 'vouches', 'trust'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('trader') || interaction.user;
    const embed = createRepEmbed(targetUser);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    const embed = createRepEmbed(targetUser);
    await message.reply({ embeds: [embed] });
  }
};

function createRepEmbed(user) {
  const rep = repDb.getReputation(user.id);
  const progressBar = createProgressBar(rep.positive, rep.total || 1, 10);

  const embed = infoEmbed(
    `Trader Reputation: ${user.username}`,
    `Community trust record and peer trading feedback.\n`
  ).setThumbnail(user.displayAvatarURL({ dynamic: true }));

  embed.addFields(
    { name: '🛡️ Trust Score', value: `\`${rep.trustScore}%\`\n${progressBar}`, inline: false },
    { name: '🟢 Positive Vouches', value: `\`+${rep.positive}\``, inline: true },
    { name: '🔴 Negative Vouches', value: `\`-${rep.negative}\``, inline: true },
    { name: '📊 Total Trades Reviewed', value: `\`${rep.total}\``, inline: true }
  );

  if (rep.recent.length > 0) {
    const reviews = rep.recent.map((v, i) => {
      const badge = v.type === 1 ? '🟢' : '🔴';
      const timeStr = `<t:${v.timestamp}:R>`;
      return `${badge} **<@${v.authorId}>** (${timeStr}):\n> "${v.comment}"`;
    });

    embed.addFields({
      name: '📝 Recent Community Reviews',
      value: reviews.join('\n\n'),
      inline: false
    });
  } else {
    embed.addFields({
      name: '📝 Recent Community Reviews',
      value: '*No trade reviews registered yet. Vouch with `/vouch` after completing a transaction!*',
      inline: false
    });
  }

  embed.setFooter({ text: 'Leave feedback with `/vouch @trader <+1|-1> <comment>`' });
  return embed;
}
