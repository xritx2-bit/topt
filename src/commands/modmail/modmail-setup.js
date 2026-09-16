const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modmail-setup')
    .setDescription('Configure the staff channel where user DM support tickets will be routed')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The staff channel for ModMail threads')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  aliases: [],

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!db.settings[interaction.guild.id]) {
      db.settings[interaction.guild.id] = {};
    }

    db.settings[interaction.guild.id].modmailChannelId = channel.id;
    db.save('settings');

    const embed = successEmbed(
      'ModMail System Configured',
      `📬 All user Direct Messages will now spawn support threads in <#${channel.id}>!\n\n` +
      `**How it works:**\n` +
      `1. When a user sends a DM to the bot, a private thread is created in <#${channel.id}>.\n` +
      `2. Staff can reply inside the thread using \`/reply <message>\`.\n` +
      `3. Staff can close the ticket using \`/close [reason]\`.`
    );

    await interaction.reply({ embeds: [embed] });
  }
};
