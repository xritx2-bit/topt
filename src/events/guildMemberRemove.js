const db = require('../database/db');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const guild = member.guild;
    const settings = db.settings[guild.id];

    if (!settings || !settings.logChannelId) return;

    const logChannel = guild.channels.cache.get(settings.logChannelId);
    if (!logChannel) return;

    const embed = errorEmbed(
      'Member Left',
      `📤 **${member.user.tag}** (<@${member.id}>) left the server.\n` +
      `👥 Member Count: \`${guild.memberCount}\``
    ).setThumbnail(member.user.displayAvatarURL());

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
