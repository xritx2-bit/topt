const { AuditLogEvent } = require('discord.js');
const antiNukeEngine = require('../antinuke/antiNukeEngine');

module.exports = {
  name: 'roleDelete',
  async execute(role) {
    if (!role.guild) return;

    try {
      const auditLogs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      });
      const entry = auditLogs.entries.first();

      if (entry && entry.executor) {
        await antiNukeEngine.handleAction({
          guild: role.guild,
          executor: entry.executor,
          actionType: 'roleDelete'
        });
      }
    } catch (err) {
      console.error('[Anti-Nuke Role Delete Error]', err);
    }
  }
};
