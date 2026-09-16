const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const warnDb = require('../../database/warnDb');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View the infraction and warning history of a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The member whose warnings to inspect')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  aliases: ['warns', 'infractions'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const warns = warnDb.getWarnings(interaction.guild.id, targetUser.id);

    const embed = infoEmbed(
      `Infractions: ${targetUser.username}`,
      `Total warnings recorded: \`${warns.length}\`\n`
    ).setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    if (warns.length === 0) {
      embed.setDescription('✅ This member has a completely clean record with 0 warnings.');
    } else {
      const list = warns.map((w, i) => {
        return `**#${w.id}** (<t:${w.timestamp}:R>) — By <@${w.moderatorId}>\n> Reason: *${w.reason}*`;
      });
      embed.setDescription(list.join('\n\n'));
    }

    embed.setFooter({ text: 'Clear infractions with /clearwarns @user' });
    await interaction.reply({ embeds: [embed] });
  }
};
