const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily timeout/mute a member in the server')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration of timeout in minutes (0 to remove timeout)')
        .setRequired(true)
        .addChoices(
          { name: 'Remove Timeout (Unmute)', value: 0 },
          { name: '1 Minute', value: 1 },
          { name: '5 Minutes', value: 5 },
          { name: '10 Minutes', value: 10 },
          { name: '1 Hour', value: 60 },
          { name: '1 Day (24 Hours)', value: 1440 },
          { name: '1 Week', value: 10080 }
        )
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['mute'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('target');
    const minutes = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'Member not found in this server.')], ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'I cannot moderate this member due to role hierarchy.')],
        ephemeral: true
      });
    }

    try {
      if (minutes === 0) {
        await member.timeout(null, reason);
        const embed = successEmbed('Timeout Removed', `🔊 Timeout has been removed for **${targetUser.tag}**.`);
        return interaction.reply({ embeds: [embed] });
      }

      const ms = minutes * 60 * 1000;
      await member.timeout(ms, reason);

      const embed = successEmbed(
        'Member Timed Out',
        `🔇 **${targetUser.tag}** has been timed out for **${minutes} minute(s)**.\n**Reason**: ${reason}`
      );
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', `Failed to apply timeout: ${err.message}`)], ephemeral: true });
    }
  }
};
