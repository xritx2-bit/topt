const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const config = require('../config');
const db = require('../database/db');
const modmailDb = require('../database/modmailDb');
const { checkMessage } = require('../automod/autoModEngine');
const { checkHoneypot } = require('../antinuke/honeypot');
const { infoEmbed, successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // ==========================================
    // 1. Direct Message Handling (Abyss-style ModMail)
    // ==========================================
    if (!message.guild) {
      await handleDirectMessage(message, client);
      return;
    }

    // ==========================================
    // 2. Staff Natural Chat in Active ModMail Ticket Channels
    // ==========================================
    const activeTicket = modmailDb.getTicketByChannel(message.channel.id);
    if (activeTicket) {
      await handleStaffTicketMessage(message, activeTicket, client);
      return;
    }

    // ==========================================
    // 3. Honeypot Trap Check
    // ==========================================
    const isHoneypot = await checkHoneypot(message);
    if (isHoneypot) return;

    // ==========================================
    // 4. AutoMod Rule Enforcement
    // ==========================================
    const autoModResult = await checkMessage(message);
    if (autoModResult.blocked) return;

    // ==========================================
    // 5. Fast OwO-Style Prefix Commands (topt <cmd> / t <cmd>)
    // ==========================================
    const content = message.content.trim();
    const primaryPrefix = config.prefix.toLowerCase();
    const altPrefix = config.altPrefix.toLowerCase();

    let matchedPrefix = null;
    if (content.toLowerCase().startsWith(primaryPrefix)) {
      matchedPrefix = primaryPrefix;
    } else if (content.toLowerCase().startsWith(altPrefix)) {
      matchedPrefix = altPrefix;
    }

    if (!matchedPrefix) return;

    let afterPrefix = content.slice(matchedPrefix.length).trim();
    if (!afterPrefix) return;

    const args = afterPrefix.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);
    if (!command) return;

    try {
      await command.executePrefix(message, args);
    } catch (error) {
      console.error(`[Prefix Command Error] ${commandName} failed:`, error);
      await message.reply({
        content: `❌ An error occurred while executing \`${commandName}\`: ${error.message}`
      }).catch(() => {});
    }
  }
};

// ==========================================
// User DM Ingestion (Abyss-style ModMail)
// ==========================================
async function handleDirectMessage(message, client) {
  const user = message.author;
  let activeTicket = modmailDb.getActiveTicketByUser(user.id);

  // Existing active ticket: Forward user message into the dedicated ticket channel
  if (activeTicket) {
    try {
      const ticketChannel = await client.channels.fetch(activeTicket.channelId).catch(() => null);
      if (ticketChannel) {
        const attachments = message.attachments.map(a => a.url).join('\n');
        const contentText = message.content || '*[Image / Attachment]*';

        const embed = infoEmbed(
          `Message from ${user.username}`,
          contentText + (attachments ? `\n\n**Attachments**:\n${attachments}` : '')
        )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `User ID: ${user.id}` });

        await ticketChannel.send({ embeds: [embed] });
        modmailDb.addTranscriptMessage(activeTicket.ticketId, {
          author: user.tag,
          content: contentText + (attachments ? ` (Attachment: ${attachments})` : ''),
          isStaff: false
        });

        await message.react('📨').catch(() => {});
        return;
      }
    } catch (err) {
      console.error('[ModMail Forward Error]', err);
    }
  }

  // Open a brand new ticket in a dedicated private channel under the ModMail category
  let targetGuild = null;
  for (const g of client.guilds.cache.values()) {
    const s = db.settings[g.id];
    if (s && s.modmailCategoryId) {
      targetGuild = g;
      break;
    }
  }

  if (!targetGuild) {
    targetGuild = client.guilds.cache.first();
  }

  if (!targetGuild) {
    await message.reply({ content: '❌ Bot is not currently active in any server.' });
    return;
  }

  try {
    const settings = db.settings[targetGuild.id] || {};
    let category = null;

    // Find configured or existing category
    if (settings.modmailCategoryId) {
      category = targetGuild.channels.cache.get(settings.modmailCategoryId);
    }

    if (!category) {
      category = targetGuild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('modmail')
      );
    }

    // Auto-create private ModMail category if missing
    if (!category) {
      category = await targetGuild.channels.create({
        name: '📂 Modmail Tickets',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: targetGuild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: targetGuild.members.me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.AttachFiles
            ]
          }
        ],
        reason: 'Auto-creating ModMail Private Category'
      });

      if (!db.settings[targetGuild.id]) db.settings[targetGuild.id] = {};
      db.settings[targetGuild.id].modmailCategoryId = category.id;
      db.save('settings');
    }

    // Clean username for channel naming (Discord requires lowercase alphanumeric + dashes)
    const cleanName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) || 'user';
    const channelName = `ticket-${cleanName}`;

    // Create private ticket channel strictly inside the category
    const ticketChannel = await targetGuild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `ModMail Ticket for ${user.tag} (ID: ${user.id}) | Staff: Type normally to reply`,
      permissionOverwrites: [
        {
          id: targetGuild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: targetGuild.members.me.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles
          ]
        }
      ],
      reason: `Support Ticket opened by ${user.tag}`
    });

    const ticketId = `ticket_${Date.now()}`;
    modmailDb.createTicket({
      ticketId,
      userId: user.id,
      guildId: targetGuild.id,
      channelId: ticketChannel.id,
      categoryId: category.id
    });

    // Action buttons for staff in the ticket channel
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mm_close_${ticketId}`)
        .setLabel('Close Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`mm_anon_${ticketId}`)
        .setLabel('Toggle Anonymous')
        .setEmoji('🕵️')
        .setStyle(ButtonStyle.Secondary)
    );

    // Initial Header Embed inside the ticket channel
    const headerEmbed = infoEmbed(
      `Support Inquiry • ${user.tag}`,
      `A new support ticket has been opened via Direct Message.\n\n` +
      `👤 **Member**: ${user.tag} (<@${user.id}>)\n` +
      `🆔 **User ID**: \`${user.id}\`\n` +
      `📅 **Registered**: <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n\n` +
      `💬 **Initial Message**:\n> "${message.content || '*[Attachment/Image]*'}"\n\n` +
      `💡 **Staff Instructions (Abyss Style)**:\n` +
      `• Type normally in this channel to send a reply to the member's DM.\n` +
      `• Prefix your message with \`=\` or \`//\` to leave an internal staff note without sending to the member.\n` +
      `• Click the **Close Ticket** button below or use \`/close\` when resolved.`
    ).setThumbnail(user.displayAvatarURL({ dynamic: true }));

    await ticketChannel.send({ embeds: [headerEmbed], components: [row] });

    // Forward any initial attachments
    if (message.attachments.size > 0) {
      const attachments = message.attachments.map(a => a.url).join('\n');
      await ticketChannel.send({ content: `📁 **Initial Attachments**:\n${attachments}` });
    }

    // Save to transcript
    modmailDb.addTranscriptMessage(ticketId, {
      author: user.tag,
      content: message.content,
      isStaff: false
    });

    // Send confirmation to user in DM
    await message.reply({
      embeds: [
        successEmbed(
          'Support Ticket Opened',
          `Your message has been delivered to the staff team at **${targetGuild.name}**!\n` +
          `A moderator will review your inquiry and reply to you directly in this DM.\n\n` +
          `📋 **Ticket Reference**: \`${ticketId}\`\n` +
          `🔒 *All messages sent in this DM will be routed to your private ticket.*`
        )
      ]
    });
  } catch (err) {
    console.error('[ModMail Ticket Creation Error]', err);
    await message.reply({ content: `❌ Failed to open support ticket: ${err.message}` });
  }
}

// ==========================================
// Staff Natural Chat in Ticket Channel (Staff -> User DM)
// ==========================================
async function handleStaffTicketMessage(message, activeTicket, client) {
  const content = message.content.trim();

  // Internal staff notes start with '=' or '//' (do not forward)
  if (content.startsWith('=') || content.startsWith('//')) {
    await message.react('📝').catch(() => {});
    return;
  }

  // Skip if it's a slash command response or bot message
  if (message.author.bot) return;

  try {
    const targetUser = await client.users.fetch(activeTicket.userId);
    if (!targetUser) {
      await message.reply({ content: '❌ Could not locate the member.' });
      return;
    }

    const senderDisplay = activeTicket.isAnonymous ? '🛡️ Support Staff Team' : `🛡️ ${message.author.tag}`;
    const attachments = message.attachments.map(a => a.url).join('\n');
    const contentText = content || '*[Attachment/Image]*';

    const embed = infoEmbed(
      `Staff Response • ${message.guild.name}`,
      contentText + (attachments ? `\n\n**Attachments**:\n${attachments}` : '')
    )
      .setFooter({ text: `From: ${senderDisplay}` });

    await targetUser.send({ embeds: [embed] });

    // Save to transcript
    modmailDb.addTranscriptMessage(activeTicket.ticketId, {
      author: senderDisplay,
      content: contentText + (attachments ? ` (Attachment: ${attachments})` : ''),
      isStaff: true
    });

    // React with checkmark to confirm delivery
    await message.react('✅').catch(() => {});
  } catch (err) {
    console.error('[ModMail Staff Message Error]', err);
    await message.reply({
      content: `⚠️ Failed to deliver message to user's DM: ${err.message}. Their DMs may be disabled.`
    }).catch(() => {});
  }
}
