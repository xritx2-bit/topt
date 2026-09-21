const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the trading server')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    ),
  aliases: [],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [errorEmbed('Member Not Found', 'This user is not in this server.')],
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'I cannot kick this member. They may have a higher role than me or be server owner.')],
        ephemeral: true
      });
    }

    try {
      await member.send(`You have been kicked from **${interaction.guild.name}**.\n**Reason**: ${reason}`).catch(() => {});
      await member.kick(reason);

      const embed = successEmbed(
        'Member Kicked',
        `👢 **${targetUser.tag}** has been kicked by **${interaction.user.tag}**.\n**Reason**: ${reason}`
      );
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed('Error', `Failed to kick member: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
