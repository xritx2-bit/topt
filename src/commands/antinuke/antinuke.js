const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const antinukeDb = require('../../database/antinukeDb');
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Configure Anti-Nuke security defenses and whitelist trusted users')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current Anti-Nuke thresholds, rules, and whitelisted staff')
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable Anti-Nuke defense')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true)
        )
    )
    .addSubcommandGroup(group =>
      group.setName('whitelist')
        .setDescription('Manage whitelisted users who bypass Anti-Nuke restrictions')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a trusted member or bot to the whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to whitelist')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a user from the whitelist')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to remove')
                .setRequired(true)
            )
        )
    ),
  aliases: [],

  async executeSlash(interaction) {
    const { isBotSuperUser } = require('../../utils/permissions');
    // Only server owner or bot master can modify Anti-Nuke settings
    if (interaction.user.id !== interaction.guild.ownerId && !isBotSuperUser(interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Owner Only', 'Only the **Server Owner** or **Bot Master** can configure Anti-Nuke defenses!')],
        ephemeral: true
      });
    }

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const config = antinukeDb.getAntiNukeConfig(interaction.guild.id);

    if (sub === 'status') {
      const whitelistText = config.whitelist.length > 0
        ? config.whitelist.map(id => `<@${id}>`).join(', ')
        : '*None (Only Server Owner is immune)*';

      const embed = infoEmbed(
        'Anti-Nuke Defense Status',
        'Real-time protection against rogue staff, compromised bots, and raid destruction:\n'
      ).addFields(
        { name: '🛡️ Defense System', value: config.enabled ? '🟢 Active & Guarding' : '🔴 Inactive', inline: true },
        { name: '🪤 Honeypot Trap', value: config.honeypotChannelId ? `<#${config.honeypotChannelId}>` : '⚠️ *Not configured (use /honeypot setup)*', inline: true },
        { name: '⏱️ Action Window', value: `\`${config.actionWindow} seconds\``, inline: true },
        { name: '🚪 Channel Delete Cap', value: `Max \`${config.channelDeleteLimit}\` per window`, inline: true },
        { name: '🎭 Role Delete Cap', value: `Max \`${config.roleDeleteLimit}\` per window`, inline: true },
        { name: '🔨 Mass Ban Cap', value: `Max \`${config.memberBanLimit}\` per window`, inline: true },
        { name: '👥 Whitelisted Immune Staff', value: whitelistText, inline: false }
      ).setFooter({ text: 'Rogue accounts exceeding limits are automatically stripped of roles and banned.' });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      config.enabled = enabled;
      const antinukeDbModule = require('../../database/db');
      antinukeDbModule.save('antinuke');

      return interaction.reply({
        embeds: [successEmbed('Anti-Nuke Updated', `Anti-Nuke defense is now **${enabled ? 'ACTIVE 🟢' : 'DISABLED 🔴'}**.`)]
      });
    }

    if (group === 'whitelist') {
      const targetUser = interaction.options.getUser('user');

      if (sub === 'add') {
        antinukeDb.addWhitelist(interaction.guild.id, targetUser.id);
        return interaction.reply({
          embeds: [successEmbed('Whitelist Updated', `Added **${targetUser.tag}** to the Anti-Nuke whitelist.`)]
        });
      }

      if (sub === 'remove') {
        antinukeDb.removeWhitelist(interaction.guild.id, targetUser.id);
        return interaction.reply({
          embeds: [successEmbed('Whitelist Updated', `Removed **${targetUser.tag}** from the Anti-Nuke whitelist.`)]
        });
      }
    }
  }
};
