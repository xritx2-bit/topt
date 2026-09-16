const { AuditLogEvent } = require('discord.js');
const antiNukeEngine = require('../antinuke/antiNukeEngine');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (!channel.guild) return;

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      });
      const entry = auditLogs.entries.first();

      if (entry && entry.executor) {
        await antiNukeEngine.handleAction({
          guild: channel.guild,
          executor: entry.executor,
          actionType: 'channelDelete'
        });
      }
    } catch (err) {
      console.error('[Anti-Nuke Channel Delete Error]', err);
    }
  }
};
