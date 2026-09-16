const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock down a channel to prevent regular members from sending messages')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to lock (defaults to current channel)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the lockdown')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  aliases: [],

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'Trading session paused or moderation lock';

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      const embed = successEmbed(
        'Channel Locked',
        `🔒 **${channel.name}** has been locked.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}`
      );
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed('Lock Failed', `Could not lock channel: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
