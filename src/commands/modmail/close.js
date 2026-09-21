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
  aliases: ['closeticket', 'endticket'],

  async executeSlash(interaction) {
    const isTicketChannel = interaction.channel.name?.startsWith('ticket-');
    const ticket = modmailDb.getTicketByChannel(interaction.channel.id) || (isTicketChannel ? { ticketId: interaction.channel.name, userId: null } : null);

    if (!ticket && !isTicketChannel) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Channel', 'This command can only be used inside an active ModMail ticket channel!')],
        ephemeral: true
      });
    }

    const reason = interaction.options.getString('reason') || 'Inquiry resolved';

    // Close in database if ticket object has real ID
    if (ticket.ticketId && ticket.userId) {
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
    }

    await interaction.reply({
      embeds: [
        successEmbed(
          'Ticket Closed',
          `🔒 Ticket has been resolved.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}\n\n*This channel will be automatically deleted in 5 seconds...*`
        )
      ]
    });

    // Delete the dedicated ticket channel after 5 seconds
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
  },

  async executePrefix(message, args) {
    const { checkModPermission } = require('../../utils/permissions');
    if (!checkModPermission(message)) {
      return message.reply({
        embeds: [errorEmbed('Permission Denied', 'Only server moderators or bot masters can close support tickets.')]
      });
    }

    const isTicketChannel = message.channel.name?.startsWith('ticket-');
    const ticket = modmailDb.getTicketByChannel(message.channel.id) || (isTicketChannel ? { ticketId: message.channel.name, userId: null } : null);

    if (!ticket && !isTicketChannel) {
      return message.reply({
        embeds: [errorEmbed('Invalid Channel', 'This command can only be used inside a ticket channel (e.g. `#ticket-...`)!')]
      });
    }

    const reason = args.join(' ') || 'Inquiry resolved';

    if (ticket.ticketId && ticket.userId) {
      modmailDb.closeTicket(ticket.ticketId, reason, message.author.tag);
    }

    await message.reply({
      embeds: [
        successEmbed(
          'Ticket Closed',
          `🔒 Ticket has been resolved.\n**Reason**: ${reason}\n**Moderator**: ${message.author.tag}\n\n*This channel will be automatically deleted in 5 seconds...*`
        )
      ]
    });

    setTimeout(async () => {
      try {
        await message.channel.delete(`ModMail Ticket Closed by ${message.author.tag}`);
      } catch (err) {
        console.error('[ModMail Channel Delete Error]', err);
      }
    }, 5000);
  }
};
