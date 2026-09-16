const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const warnDb = require('../../database/warnDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a formal moderation warning to a member')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: [],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Action', 'You cannot warn yourself!')], ephemeral: true });
    }

    if (targetUser.bot) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Action', 'You cannot warn bot accounts!')], ephemeral: true });
    }

    const warning = warnDb.addWarning({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      reason
    });

    const userWarns = warnDb.getWarnings(interaction.guild.id, targetUser.id);

    // Send DM to target
    await targetUser.send({
      embeds: [
        errorEmbed(
          `Warning Received • ${interaction.guild.name}`,
          `You were warned by **${interaction.user.tag}**.\n` +
          `**Reason**: "${reason}"\n` +
          `**Total Warnings**: \`${userWarns.length}\``
        )
      ]
    }).catch(() => {});

    const embed = successEmbed(
      'Warning Issued',
      `⚠️ **${targetUser.tag}** has been warned by **${interaction.user.tag}**.\n` +
      `**Reason**: ${reason}\n` +
      `**Infraction Count**: \`${userWarns.length}\``
    );

    await interaction.reply({ embeds: [embed] });
  }
};
