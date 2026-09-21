const { SlashCommandBuilder, ChannelType } = require('discord.js');
const antinukeDb = require('../../database/antinukeDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

const data = new SlashCommandBuilder()
  .setName('honeypot')
  .setDescription('Configure a decoy Honeypot channel to automatically capture and ban raid bots')
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Set an existing channel or create a new decoy honeypot channel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Existing channel to designate as honeypot (leave blank to create one)')
          .setRequired(false)
      )
  );

module.exports = {
  data,
  aliases: [],

  async executeSlash(interaction) {
    const { isBotSuperUser } = require('../../utils/permissions');
    if (interaction.user.id !== interaction.guild.ownerId && !isBotSuperUser(interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Owner Only', 'Only the **Server Owner** or **Bot Master** can setup the Honeypot trap!')],
        ephemeral: true
      });
    }

    let targetChannel = interaction.options.getChannel('channel');

    if (!targetChannel) {
      // Auto-create a decoy honeypot channel
      targetChannel = await interaction.guild.channels.create({
        name: 'rules-verification',
        type: ChannelType.GuildText,
        topic: '⚠️ AUTOMATED HONEYPOT TRAP: DO NOT POST HERE. ANY MESSAGES SENT WILL RESULT IN AN INSTANT PERMANENT BAN.',
        reason: 'Honeypot Decoy Channel Creation'
      });

      // Post deterrent warning message
      await targetChannel.send({
        content: `🚨 **SECURITY HONEYPOT TRAP** 🚨\n\n` +
                 `This is an automated trap for malicious raid bots.\n` +
                 `**DO NOT SEND ANY MESSAGES HERE.**\n` +
                 `Any account that sends a message or reacts in this channel will be **instantly banned** from this server.`
      });
    }

    // Save channel ID in antinuke DB
    antinukeDb.setHoneypot(interaction.guild.id, targetChannel.id);

    const embed = successEmbed(
      'Honeypot Trap Armed',
      `🪤 <#${targetChannel.id}> is now configured as the **Honeypot Trap**!\n\n` +
      `**How it functions:**\n` +
      `• Any unauthorized member or scraping raid bot that posts in this channel will be **instantly auto-banned**.\n` +
      `• Server Owner and whitelisted staff are exempt.\n` +
      `• Alerts will be sent directly to your DMs when a bot is captured.`
    );

    await interaction.reply({ embeds: [embed] });
  }
};
