const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const automodDb = require('../../database/automodDb');
const { infoEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure Carl-bot style automated moderation protections')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View active AutoMod configurations and thresholds')
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable a specific AutoMod feature')
        .addStringOption(option =>
          option.setName('feature')
            .setDescription('The security feature to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Anti-Invite (Blocks Discord Server Links)', value: 'antiInvite' },
              { name: 'Anti-Link (Blocks External URLs)', value: 'antiLink' },
              { name: 'Anti-Spam (Blocks Rapid Message Floods)', value: 'antiSpam' }
            )
        )
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('addword')
        .setDescription('Add a forbidden word or scam phrase to the blacklist')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('Word or phrase to blacklist')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('removeword')
        .setDescription('Remove a word from the blacklist')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('Word or phrase to remove')
            .setRequired(true)
        )
    ),
  aliases: [],

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const config = automodDb.getAutoModConfig(interaction.guild.id);

    if (sub === 'status') {
      const embed = infoEmbed(
        'AutoMod Protection Status',
        'Real-time automated filters and defense thresholds for this server:\n'
      ).addFields(
        { name: '🔗 Anti-Invite Filter', value: config.antiInvite ? '🟢 Enabled (Deletes server invites)' : '🔴 Disabled', inline: true },
        { name: '🌐 Anti-Link Filter', value: config.antiLink ? '🟢 Enabled (Deletes external URLs)' : '🔴 Disabled', inline: true },
        { name: '⚡ Anti-Spam Flood', value: config.antiSpam ? '🟢 Enabled (Auto-times out floods)' : '🔴 Disabled', inline: true },
        { name: '📢 Mass Mention Cap', value: `\`${config.maxMentions || 5} mentions\``, inline: true },
        {
          name: `🚫 Blacklisted Words (${config.bannedWords ? config.bannedWords.length : 0})`,
          value: config.bannedWords && config.bannedWords.length > 0 ? config.bannedWords.map(w => `\`${w}\``).join(', ') : '*None configured*',
          inline: false
        }
      );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'toggle') {
      const feature = interaction.options.getString('feature');
      const enabled = interaction.options.getBoolean('enabled');

      automodDb.updateAutoModConfig(interaction.guild.id, feature, enabled);

      const embed = successEmbed(
        'AutoMod Setting Updated',
        `Feature \`${feature}\` has been **${enabled ? 'ENABLED 🟢' : 'DISABLED 🔴'}**.`
      );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'addword') {
      const word = interaction.options.getString('word');
      const added = automodDb.addBannedWord(interaction.guild.id, word);

      if (!added) {
        return interaction.reply({
          embeds: [errorEmbed('Already Exists', `\`${word}\` is already on the blacklist.`)],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [successEmbed('Blacklist Updated', `Added \`${word}\` to the forbidden words filter.`)]
      });
    }

    if (sub === 'removeword') {
      const word = interaction.options.getString('word');
      const removed = automodDb.removeBannedWord(interaction.guild.id, word);

      if (!removed) {
        return interaction.reply({
          embeds: [errorEmbed('Not Found', `\`${word}\` was not found in the blacklist.`)],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [successEmbed('Blacklist Updated', `Removed \`${word}\` from the forbidden words filter.`)]
      });
    }
  }
};
