const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to unlock (defaults to current channel)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  aliases: [],

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      const embed = successEmbed(
        'Channel Unlocked',
        `🔓 **${channel.name}** has been unlocked. Members can send messages again.`
      );
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed('Unlock Failed', `Could not unlock channel: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
