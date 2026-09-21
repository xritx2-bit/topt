const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modmailDb = require('../../database/modmailDb');
const db = require('../../database/db');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close, resolve, and delete this ModMail ticket channel')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for closing this ticket')
        .setRequired(false)
    ),
  aliases: [],

  async executeSlash(interaction) {
    const ticket = modmailDb.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Channel', 'This command can only be used inside an active ModMail ticket channel!')],
        ephemeral: true
      });
    }

    const reason = interaction.options.getString('reason') || 'Inquiry resolved';

    // Close in database
    modmailDb.closeTicket(ticket.ticketId, reason, interaction.user.tag);

    // Send closing transcript to user via DM
    try {
      const user = await interaction.client.users.fetch(ticket.userId).catch(() => null);
      if (user) {
        const transcriptLines = (ticket.transcript || []).map(m => `[${m.isStaff ? 'STAFF' : 'USER'}] ${m.author}: ${m.content}`);
        const transcriptText = transcriptLines.slice(-15).join('\n') || 'No recorded messages.';

        await user.send({
          embeds: [
            infoEmbed(
              `Support Ticket Closed • ${interaction.guild.name}`,
              `Your support inquiry has been closed by staff.\n\n` +
              `📋 **Ticket ID**: \`${ticket.ticketId}\`\n` +
              `📝 **Closing Reason**: ${reason}\n` +
              `🛡️ **Closed By**: ${interaction.user.tag}\n\n` +
              `**Recent Transcript Snapshot**:\n\`\`\`\n${transcriptText.slice(0, 800)}\n\`\`\`\n` +
              `*If you need further assistance in the future, simply send another DM to this bot!*`
            )
          ]
        }).catch(() => {});
      }
    } catch {}

    // Send full transcript to #modmail-logs if configured
    const settings = db.settings[interaction.guild.id] || {};
    if (settings.modmailLogsId) {
      const logsChannel = interaction.guild.channels.cache.get(settings.modmailLogsId);
      if (logsChannel) {
        const transcriptLines = (ticket.transcript || []).map(m => `[${m.isStaff ? 'STAFF' : 'USER'}] ${m.author}: ${m.content}`);
        const transcriptText = transcriptLines.join('\n') || 'No messages.';

        await logsChannel.send({
          embeds: [
            infoEmbed(
              `Ticket Closed • ${ticket.ticketId}`,
              `👤 **Member**: <@${ticket.userId}> (ID: \`${ticket.userId}\`)\n` +
              `🛡️ **Closed By**: ${interaction.user.tag}\n` +
              `📝 **Reason**: ${reason}\n` +
              `💬 **Messages Count**: ${ticket.transcript ? ticket.transcript.length : 0}\n\n` +
              `\`\`\`\n${transcriptText.slice(0, 1800)}\n\`\`\``
            )
          ]
        }).catch(() => {});
      }
    }

    await interaction.reply({
      embeds: [
        successEmbed(
          'Ticket Closed',
          `🔒 Ticket has been resolved.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}\n\n*This channel will be automatically deleted in 5 seconds...*`
        )
      ]
    });

    // Delete the dedicated ticket channel after 5 seconds (or archive thread if thread)
    setTimeout(async () => {
      try {
        if (interaction.channel.isThread?.() && interaction.channel.isThread()) {
          await interaction.channel.setArchived(true, `ModMail Ticket Closed by ${interaction.user.tag}`);
        } else {
          await interaction.channel.delete(`ModMail Ticket Closed by ${interaction.user.tag}`);
        }
      } catch (err) {
        console.error('[ModMail Channel Delete Error]', err);
      }
    }, 5000);
  }
};
