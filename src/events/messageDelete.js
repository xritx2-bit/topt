const db = require('../database/db');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const settings = db.settings[message.guild.id];
    if (!settings || !settings.logChannelId) return;

    const logChannel = message.guild.channels.cache.get(settings.logChannelId);
    if (!logChannel) return;

    const embed = errorEmbed(
      'Message Deleted',
      `🗑️ A message was deleted in <#${message.channel.id}>.\n\n` +
      `👤 **Author**: ${message.author?.tag || 'Unknown'} (<@${message.author?.id}>)\n` +
      `💬 **Content**: "${message.content ? message.content.slice(0, 1000) : '*No text content*'}"`
    );

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
