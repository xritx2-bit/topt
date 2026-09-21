const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const warnDb = require('../../database/warnDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all moderation warnings from a member\'s record')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member whose warnings should be cleared')
        .setRequired(true)
    ),
  aliases: [],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('target');
    const removedCount = warnDb.clearWarnings(interaction.guild.id, targetUser.id);

    if (removedCount === 0) {
      return interaction.reply({
        embeds: [errorEmbed('No Warnings', `**${targetUser.tag}** already has a clean record with 0 warnings.`)],
        ephemeral: true
      });
    }

    const embed = successEmbed(
      'Warnings Cleared',
      `🧹 Cleared **${removedCount}** warning(s) from **${targetUser.tag}**'s profile.`
    );

    await interaction.reply({ embeds: [embed] });
  }
};
