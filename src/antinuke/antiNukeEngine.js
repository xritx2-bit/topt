const antinukeDb = require('../database/antinukeDb');
const { errorEmbed } = require('../utils/embeds');

// In-memory action rate tracker: Map<guildId_userId_action, Array<timestamp>>
const actionTracker = new Map();

async function handleAction({ guild, executor, actionType, count = 1 }) {
  if (!guild || !executor || executor.id === guild.client.user.id) return;

  // Server owner is unconditionally immune
  if (executor.id === guild.ownerId) return;

  // Check whitelist
  if (antinukeDb.isWhitelisted(guild.id, executor.id, guild.ownerId)) {
    return;
  }

  const config = antinukeDb.getAntiNukeConfig(guild.id);
  if (!config.enabled) return;

  const now = Date.now();
  const windowMs = (config.actionWindow || 10) * 1000;
  const trackerKey = `${guild.id}_${executor.id}_${actionType}`;

  let timestamps = actionTracker.get(trackerKey) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);
  timestamps.push(now);
  actionTracker.set(trackerKey, timestamps);

  const limits = {
    channelDelete: config.channelDeleteLimit || 2,
    roleDelete: config.roleDeleteLimit || 2,
    memberBan: config.memberBanLimit || 3,
    memberKick: config.memberKickLimit || 3
  };

  const limit = limits[actionType] || 2;

  if (timestamps.length >= limit) {
    actionTracker.delete(trackerKey);
    await executeNukePunishment(guild, executor, actionType, timestamps.length);
  }
}

async function executeNukePunishment(guild, executor, actionType, count) {
  console.warn(`[ANTI-NUKE ALERT] Rogue action detected in ${guild.name} by ${executor.tag} (${actionType}: ${count})!`);

  const member = await guild.members.fetch(executor.id).catch(() => null);

  // 1. Strip all roles from executor
  if (member && member.manageable) {
    const rolesToRemove = member.roles.cache.filter(r => r.name !== '@everyone');
    await member.roles.remove(rolesToRemove, 'Anti-Nuke Triggered: Mass destruction attempt').catch(() => {});
  }

  // 2. Ban executor if possible
  if (member && member.bannable) {
    await member.ban({ reason: `Anti-Nuke Triggered: Exceeded ${actionType} threshold` }).catch(() => {});
  }

  // 3. Alert Server Owner directly via DM
  const owner = await guild.fetchOwner().catch(() => null);
  if (owner) {
    await owner.send({
      embeds: [
        errorEmbed(
          '🚨 CRITICAL ANTI-NUKE TRIGGERED 🚨',
          `An unauthorized member triggered Anti-Nuke defense in **${guild.name}**!\n\n` +
          `👤 **Offender**: ${executor.tag} (<@${executor.id}>)\n` +
          `⚡ **Action**: Rapid ${actionType} (${count} events in 10s)\n` +
          `🛡️ **Status**: Offender has been stripped of all roles and banned.\n` +
          `⚠️ **Next Steps**: Please review server audit logs immediately.`
        )
      ]
    }).catch(() => {});
  }

  // 4. Log to system channel if available
  if (guild.systemChannel) {
    await guild.systemChannel.send({
      content: `@everyone`,
      embeds: [
        errorEmbed(
          '🚨 ANTI-NUKE INTERVENTION 🚨',
          `A mass action attack was intercepted. **${executor.tag}** has been banned and stripped of permissions.`
        )
      ]
    }).catch(() => {});
  }
}

module.exports = {
  handleAction,
  executeNukePunishment
};
