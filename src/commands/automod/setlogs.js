const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogs')
    .setDescription('Set the channel for Carl-bot style moderation & audit logs')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where audit logs will be posted')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  aliases: [],

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!db.settings[interaction.guild.id]) {
      db.settings[interaction.guild.id] = {};
    }

    db.settings[interaction.guild.id].logChannelId = channel.id;
    db.save('settings');

    const embed = successEmbed(
      'Audit Log Channel Configured',
      `📜 All deleted messages, edited messages, member joins/leaves, and punishments will now be logged to <#${channel.id}>!`
    );

    await interaction.reply({ embeds: [embed] });
  }
};
