const selfRoleDb = require('../database/selfRoleDb');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[Command Error] No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.executeSlash(interaction);
      } catch (error) {
        console.error(`[Execution Error] Command /${interaction.commandName} failed:`, error);
        const errPayload = {
          embeds: [errorEmbed('Command Error', 'An unexpected error occurred while executing this command.')],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errPayload).catch(() => {});
        } else {
          await interaction.reply(errPayload).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Self-Role Button Clicks
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith('sr_')) {
        const selfRole = selfRoleDb.getSelfRole(customId);
        if (!selfRole) {
          return interaction.reply({
            embeds: [errorEmbed('Role Not Found', 'This self-role configuration is no longer active.')],
            ephemeral: true
          });
        }

        const role = interaction.guild.roles.cache.get(selfRole.roleId);
        if (!role) {
          return interaction.reply({
            embeds: [errorEmbed('Role Not Found', 'The associated role no longer exists on this server.')],
            ephemeral: true
          });
        }

        const member = interaction.member;
        const botMember = interaction.guild.members.me;

        if (!botMember.permissions.has('ManageRoles') || role.comparePositionTo(botMember.roles.highest) >= 0) {
          return interaction.reply({
            embeds: [errorEmbed('Permission Error', 'I do not have high enough role permissions to grant or remove this role!')],
            ephemeral: true
          });
        }

        try {
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            return interaction.reply({
              embeds: [successEmbed('Role Removed', `❌ Removed the **${role.name}** role from your profile.`)],
              ephemeral: true
            });
          } else {
            await member.roles.add(role);
            return interaction.reply({
              embeds: [successEmbed('Role Assigned', `✅ Granted the **${role.name}** role to your profile!`)],
              ephemeral: true
            });
        } catch (err) {
          console.error('[Self-Role Error]', err);
          return interaction.reply({
            embeds: [errorEmbed('Role Error', `Failed to update roles: ${err.message}`)],
            ephemeral: true
          });
        }
      }

      // 3. Handle Abyss-Style ModMail Buttons
      if (customId.startsWith('mm_close_')) {
        const ticketId = customId.replace('mm_close_', '');
        const ticket = modmailDb.getTicketByChannel(interaction.channel.id) || modmailDb.tickets?.[ticketId];

        if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageMessages')) {
          return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'Only server moderators can close support tickets.')],
            ephemeral: true
          });
        }

        await interaction.reply({
          embeds: [
            successEmbed(
              'Ticket Closing',
              `🔒 Ticket closed by **${interaction.user.tag}**.\n*This channel will be automatically deleted in 5 seconds...*`
            )
          ]
        });

        // Close ticket in DB
        modmailDb.closeTicket(ticketId, 'Resolved by Staff', interaction.user.tag);

        // Send transcript to member DM
        if (ticket) {
          try {
            const user = await interaction.client.users.fetch(ticket.userId).catch(() => null);
            if (user) {
              const transcriptLines = (ticket.transcript || []).map(m => `[${m.isStaff ? 'STAFF' : 'USER'}] ${m.author}: ${m.content}`);
              const transcriptText = transcriptLines.slice(-15).join('\n') || 'No recorded messages.';

              await user.send({
                embeds: [
                  infoEmbed(
                    `Ticket Closed • ${interaction.guild.name}`,
                    `Your support inquiry has been resolved and closed by staff.\n\n` +
                    `📋 **Ticket ID**: \`${ticket.ticketId}\`\n` +
                    `🛡️ **Moderator**: ${interaction.user.tag}\n\n` +
                    `**Recent Transcript Snapshot**:\n\`\`\`\n${transcriptText.slice(0, 800)}\n\`\`\`\n` +
                    `*If you have new questions, simply send another DM to this bot!*`
                  )
                ]
              }).catch(() => {});
            }
          } catch (err) {
            console.error('[ModMail Close DM Error]', err);
          }

          // Send transcript to modmail-logs if configured
          const settings = require('../database/db').settings[interaction.guild.id] || {};
          if (settings.modmailLogsId) {
            const logsChannel = interaction.guild.channels.cache.get(settings.modmailLogsId);
            if (logsChannel) {
              const transcriptLines = (ticket.transcript || []).map(m => `[${m.isStaff ? 'STAFF' : 'USER'}] ${m.author}: ${m.content}`);
              const transcriptText = transcriptLines.join('\n') || 'No messages.';

              await logsChannel.send({
                embeds: [
                  infoEmbed(
                    `Ticket Transcript • ${ticket.ticketId}`,
                    `👤 **Member**: <@${ticket.userId}> (ID: \`${ticket.userId}\`)\n` +
                    `🛡️ **Closed By**: ${interaction.user.tag}\n` +
                    `💬 **Messages Count**: ${ticket.transcript ? ticket.transcript.length : 0}\n\n` +
                    `\`\`\`\n${transcriptText.slice(0, 1800)}\n\`\`\``
                  )
                ]
              }).catch(() => {});
            }
          }
        }

        // Delete the dedicated ticket channel after 5 seconds
        setTimeout(async () => {
          try {
            await interaction.channel.delete('ModMail Ticket Closed');
          } catch (err) {
            console.error('[Ticket Channel Delete Error]', err);
          }
        }, 5000);

        return;
      }

      if (customId.startsWith('mm_anon_')) {
        const ticketId = customId.replace('mm_anon_', '');
        const isAnon = modmailDb.toggleAnonymous(ticketId);

        return interaction.reply({
          embeds: [
            successEmbed(
              'Anonymous Mode Toggled',
              `🕵️ Anonymous staff replies for this ticket are now **${isAnon ? 'ENABLED (Sent as "Support Staff")' : 'DISABLED (Staff tags shown)'}**.`
            )
          ],
          ephemeral: true
        });
      }
    }
  }
};
