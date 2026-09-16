const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modmailDb = require('../../database/modmailDb');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close and resolve this ModMail ticket thread')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for closing this ticket')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: [],

  async executeSlash(interaction) {
    const ticket = modmailDb.getTicketByThread(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Channel', 'This command can only be used inside an active ModMail ticket thread!')],
        ephemeral: true
      });
    }

    const reason = interaction.options.getString('reason') || 'Inquiry resolved';

    // Close in database
    modmailDb.closeTicket(ticket.ticketId, reason, interaction.user.tag);

    // Notify the user via DM
    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      if (user) {
        await user.send({
          embeds: [
            infoEmbed(
              `Support Ticket Closed • ${interaction.guild.name}`,
              `Your support inquiry has been closed by staff.\n\n` +
              `📋 **Ticket ID**: \`${ticket.ticketId}\`\n` +
              `📝 **Closing Reason**: ${reason}\n` +
              `🛡️ **Closed By**: ${interaction.user.tag}\n\n` +
              `*If you need further assistance in the future, simply send another DM to this bot!*`
            )
          ]
        }).catch(() => {});
      }
    } catch {}

    await interaction.reply({
      embeds: [
        successEmbed(
          'Ticket Closed & Archived',
          `This ticket has been resolved.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}`
        )
      ]
    });

    // Archive / Lock the thread after 3 seconds
    setTimeout(async () => {
      try {
        if (interaction.channel.isThread()) {
          await interaction.channel.setArchived(true, `ModMail Ticket Closed by ${interaction.user.tag}`);
        }
      } catch (err) {
        console.error('[ModMail Archive Error]', err);
      }
    }, 3000);
  }
};
