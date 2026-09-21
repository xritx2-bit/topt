const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Permanently ban a user from the trading server')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    ),
  aliases: [],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Violating server or trading rules';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member && !member.bannable) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'I cannot ban this member. Their highest role is equal to or higher than my bot role.')],
        ephemeral: true
      });
    }

    try {
      if (member) {
        await member.send(`You have been banned from **${interaction.guild.name}**.\n**Reason**: ${reason}`).catch(() => {});
      }

      await interaction.guild.members.ban(targetUser.id, { reason });

      const embed = successEmbed(
        'User Banned',
        `🔨 **${targetUser.tag}** has been banned from the server.\n**Reason**: ${reason}\n**Moderator**: ${interaction.user.tag}`
      );
      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed('Ban Error', `Failed to ban user: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};
