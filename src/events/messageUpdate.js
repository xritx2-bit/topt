const db = require('../database/db');
const { infoEmbed } = require('../utils/embeds');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const settings = db.settings[newMessage.guild.id];
    if (!settings || !settings.logChannelId) return;

    const logChannel = newMessage.guild.channels.cache.get(settings.logChannelId);
    if (!logChannel) return;

    const embed = infoEmbed(
      'Message Edited',
      `✏️ A message was edited in <#${newMessage.channel.id}> by ${newMessage.author.tag}.\n\n` +
      `**Before**: "${oldMessage.content ? oldMessage.content.slice(0, 500) : '*No text*'}"\n\n` +
      `**After**: "${newMessage.content ? newMessage.content.slice(0, 500) : '*No text*'}"`
    );

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
