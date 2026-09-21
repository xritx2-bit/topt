const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modmailDb = require('../../database/modmailDb');
const { errorEmbed, successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reply')
    .setDescription('Reply directly to the member in this ModMail ticket thread')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send to the member via DM')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('anonymous')
        .setDescription('Send as "Support Staff" without revealing your username')
        .setRequired(false)
    ),
  aliases: ['r'],

  async executeSlash(interaction) {
    // Must be run inside an active ticket thread
    const ticket = modmailDb.getTicketByThread(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Channel', 'This command can only be used inside an active ModMail ticket thread!')],
        ephemeral: true
      });
    }

    const replyText = interaction.options.getString('message');
    const isAnonymous = interaction.options.getBoolean('anonymous') || false;

    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      if (!user) {
        return interaction.reply({ embeds: [errorEmbed('User Not Found', 'Could not find the member.')], ephemeral: true });
      }

      const senderName = isAnonymous ? '🛡️ Support Staff Team' : `🛡️ ${interaction.user.tag}`;

      // Send formatted DM to member
      await user.send({
        embeds: [
          infoEmbed(
            `Staff Response • ${interaction.guild.name}`,
            replyText
          ).setFooter({ text: `From: ${senderName}` })
        ]
      });

      // Confirm in thread
      const threadEmbed = successEmbed(
        `Sent to ${user.username}`,
        `**Staff**: ${senderName}\n**Message**: "${replyText}"`
      );

      await interaction.reply({ embeds: [threadEmbed] });
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed('Delivery Failed', `Could not DM the user: ${err.message}. They may have DMs closed.`)],
        ephemeral: true
      });
    }
  }
};
