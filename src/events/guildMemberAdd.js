const { AuditLogEvent } = require('discord.js');
const db = require('../database/db');
const antinukeDb = require('../database/antinukeDb');
const { infoEmbed, successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const guild = member.guild;

    // 1. Anti-Nuke: Check for unauthorized Bot additions
    if (member.user.bot) {
      const antinukeConfig = antinukeDb.getAntiNukeConfig(guild.id);
      if (antinukeConfig.enabled) {
        try {
          const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 1 });
          const entry = auditLogs.entries.first();

          if (entry && entry.target.id === member.id) {
            const inviter = entry.executor;
            const isImmune = antinukeDb.isWhitelisted(guild.id, inviter.id, guild.ownerId);

            if (!isImmune) {
              console.warn(`[ANTI-NUKE] Unauthorized bot added by ${inviter.tag}. Banning rogue bot!`);
              await member.ban({ reason: `Anti-Nuke: Unauthorized bot invited by non-whitelisted user (${inviter.tag})` }).catch(() => {});

              // Punish the inviter
              const inviterMember = await guild.members.fetch(inviter.id).catch(() => null);
              if (inviterMember && inviterMember.manageable) {
                const dangerousRoles = inviterMember.roles.cache.filter(r => r.name !== '@everyone');
                await inviterMember.roles.remove(dangerousRoles, 'Anti-Nuke: Unauthorized bot invitation').catch(() => {});
              }
              return;
            }
          }
        } catch (err) {
          console.error('[Anti-Nuke Bot Add Check Error]', err);
        }
      }
    }

    const settings = db.settings[guild.id] || {};

    // 2. Auto-Role Assignment
    if (settings.autoroleId) {
      const role = guild.roles.cache.get(settings.autoroleId);
      if (role && guild.members.me.permissions.has('ManageRoles') && role.comparePositionTo(guild.members.me.roles.highest) < 0) {
        await member.roles.add(role, 'Auto-Role on Join').catch(() => {});
      }
    }

    // 3. Welcome Message
    if (settings.welcomeChannelId) {
      const welcomeChannel = guild.channels.cache.get(settings.welcomeChannelId);
      if (welcomeChannel) {
        const welcomeEmbed = successEmbed(
          `Welcome to ${guild.name}!`,
          `👋 Welcome to the trading community, <@${member.id}>!\n\n` +
          `• Claim your starting **500 TOPT Coins** with \`topt daily\` or \`/daily\`!\n` +
          `• Get your trading roles in the self-roles channel.\n` +
          `• Have a question? Send a Direct Message to this bot to open a support ticket!`
        ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

        await welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
      }
    }

    // 4. Join Audit Logging
    if (settings.logChannelId) {
      const logChannel = guild.channels.cache.get(settings.logChannelId);
      if (logChannel) {
        const logEmbed = infoEmbed(
          'Member Joined',
          `📥 **${member.user.tag}** (<@${member.id}>) joined the server.\n` +
          `📅 Account Created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
          `👥 Member Count: \`${guild.memberCount}\``
        ).setThumbnail(member.user.displayAvatarURL());

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  }
};
