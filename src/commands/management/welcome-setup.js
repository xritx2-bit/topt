const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-setup')
    .setDescription('Configure automatic welcome messages and auto-roles for new members')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where welcome messages will be announced')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('autorole')
        .setDescription('Optional role to automatically assign to new members')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  aliases: [],

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('autorole');

    if (!db.settings[interaction.guild.id]) {
      db.settings[interaction.guild.id] = {};
    }

    db.settings[interaction.guild.id].welcomeChannelId = channel.id;
    if (role) {
      db.settings[interaction.guild.id].autoroleId = role.id;
    }
    db.save('settings');

    let desc = `🎉 Welcome announcements will be posted in <#${channel.id}>!\n`;
    if (role) {
      desc += `🎭 New members will automatically receive the <@&${role.id}> role.`;
    }

    const embed = successEmbed('Welcome System Configured', desc);
    await interaction.reply({ embeds: [embed] });
  }
};
