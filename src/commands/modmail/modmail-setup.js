const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const db = require('../../database/db');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modmail-setup')
    .setDescription('Set up Abyss-style private ModMail category and ticket channels')
    .addChannelOption(option =>
      option.setName('category')
        .setDescription('Optional: existing category to use for tickets (creates one automatically if blank)')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('logs_channel')
        .setDescription('Optional: channel for ticket closing transcripts and audit logs')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  aliases: [],

  async executeSlash(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;

    let category = interaction.options.getChannel('category');
    let logsChannel = interaction.options.getChannel('logs_channel');

    try {
      // 1. Create or verify private category
      if (!category) {
        // Look for existing category first
        category = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('modmail')
        );

        if (!category) {
          category = await guild.channels.create({
            name: '📂 Modmail Tickets',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: guild.members.me.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.EmbedLinks,
                  PermissionsBitField.Flags.AttachFiles,
                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              }
            ],
            reason: 'Abyss-style ModMail Category Setup'
          });
        }
      }

      // 2. Create or verify logs channel
      if (!logsChannel) {
        logsChannel = guild.channels.cache.find(
          c => c.name.toLowerCase() === 'modmail-logs'
        );

        if (!logsChannel) {
          logsChannel = await guild.channels.create({
            name: 'modmail-logs',
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: guild.members.me.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.EmbedLinks
                ]
              }
            ],
            reason: 'Abyss-style ModMail Logs Setup'
          });
        }
      }

      // 3. Save settings
      if (!db.settings[guild.id]) {
        db.settings[guild.id] = {};
      }

      db.settings[guild.id].modmailCategoryId = category.id;
      db.settings[guild.id].modmailLogsId = logsChannel.id;
      // Clear any old channel config so it never falls back to general
      delete db.settings[guild.id].modmailChannelId;
      db.save('settings');

      const embed = successEmbed(
        'Abyss-Style ModMail Initialized',
        `✅ Dedicated private ticket infrastructure is ready!\n\n` +
        `📂 **Private Category**: \`${category.name}\` (<#${category.id}>)\n` +
        `📜 **Transcript Logs**: <#${logsChannel.id}>\n\n` +
        `**How Abyss ModMail Works:**\n` +
        `• When a member sends a DM to the bot, a **private text channel** is automatically created under the \`${category.name}\` category.\n` +
        `• The channel is completely hidden from regular members (` + '`@everyone` denied ViewChannel' + `).\n` +
        `• **Natural Chatting**: Staff can simply type in the ticket channel to reply to the member's DM!\n` +
        `• To leave an internal staff note, prefix your message with \`=\` or \`//\`.\n` +
        `• Click the **Close Ticket** button or run \`/close\` to archive and generate a transcript.`
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[ModMail Setup Error]', err);
      await interaction.editReply({
        embeds: [errorEmbed('Setup Failed', `Could not complete ModMail setup: ${err.message}`)]
      });
    }
  }
};
