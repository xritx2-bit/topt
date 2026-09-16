const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information and statistics about this trading server'),
  aliases: ['sinfo', 'guildinfo'],

  async executeSlash(interaction) {
    const embed = await createServerInfoEmbed(interaction.guild);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const embed = await createServerInfoEmbed(message.guild);
    await message.reply({ embeds: [embed] });
  }
};

async function createServerInfoEmbed(guild) {
  const owner = await guild.fetchOwner();
  const members = guild.memberCount;
  const channels = guild.channels.cache.size;
  const roles = guild.roles.cache.size;
  const boostCount = guild.premiumSubscriptionCount || 0;
  const boostTier = guild.premiumTier;

  return infoEmbed(`${guild.name}`, `Trading Community Hub Statistics`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: '👑 Server Owner', value: `${owner.user.tag} (<@${owner.id}>)`, inline: true },
      { name: '👥 Total Members', value: `\`${members}\` traders`, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: '💬 Channels', value: `\`${channels}\` channels`, inline: true },
      { name: '🎭 Roles', value: `\`${roles}\` roles`, inline: true },
      { name: '🚀 Boost Level', value: `Level ${boostTier} (${boostCount} boosts)`, inline: true },
      { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: false }
    );
}
