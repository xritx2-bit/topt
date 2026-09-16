const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const repDb = require('../../database/repDb');
const { infoEmbed } = require('../../utils/embeds');
const { formatCurrency } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Inspect detailed member information and trading credentials')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member to inspect')
        .setRequired(false)
    ),
  aliases: ['whois', 'uinfo'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const embed = createUserinfoEmbed(targetUser, member);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first() || message.author;
    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
    const embed = createUserinfoEmbed(targetUser, member);
    await message.reply({ embeds: [embed] });
  }
};

function createUserinfoEmbed(user, member) {
  const profile = economyDb.getUser(user.id);
  const rep = repDb.getReputation(user.id);
  const totalWealth = (profile.wallet || 0) + (profile.bank || 0);

  const embed = infoEmbed(`Trader Profile: ${user.tag}`, `Member identity and server status.`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
      { name: '📅 Registered', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
    );

  if (member) {
    const joinedAt = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
    const roles = member.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => `<@&${r.id}>`)
      .slice(0, 10);

    embed.addFields(
      { name: '📥 Joined Server', value: joinedAt, inline: true },
      { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles.length > 0 ? roles.join(' ') : 'None', inline: false }
    );
  }

  embed.addFields(
    { name: '🪙 TOPT Net Worth', value: `\`${formatCurrency(totalWealth)}\``, inline: true },
    { name: '🤝 Trade Trust Score', value: `\`${rep.trustScore}%\` (+${rep.positive} / -${rep.negative})`, inline: true }
  );

  return embed;
}
