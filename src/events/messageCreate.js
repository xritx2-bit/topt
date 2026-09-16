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
    // 2. Honeypot Trap Check
    // ==========================================
    const isHoneypot = await checkHoneypot(message);
    if (isHoneypot) return;

    // ==========================================
    // 3. AutoMod Rule Enforcement
    // ==========================================
    const autoModResult = await checkMessage(message);
    if (autoModResult.blocked) return;

    // ==========================================
    // 4. Fast OwO-Style Prefix Commands (topt <cmd> / t <cmd>)
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

// Handle incoming user DM for ModMail
async function handleDirectMessage(message, client) {
  const userId = message.author.id;
  let activeTicket = modmailDb.getActiveTicketByUser(userId);

  if (activeTicket) {
    // Forward message to existing ticket thread
    try {
      const channel = await client.channels.fetch(activeTicket.channelId).catch(() => null);
      if (channel) {
        const thread = await channel.threads.fetch(activeTicket.threadId).catch(() => null);
        if (thread) {
          const attachments = message.attachments.map(a => a.url).join('\n');
          const embed = infoEmbed(
            `Message from ${message.author.username}`,
            message.content + (attachments ? `\n\n**Attachments**:\n${attachments}` : '')
          ).setThumbnail(message.author.displayAvatarURL());

          await thread.send({ embeds: [embed] });
          await message.react('📨').catch(() => {});
          return;
        }
      }
    } catch (err) {
      console.error('[ModMail Forward Error]', err);
    }
  }

  // Open a new ticket thread in the guild's modmail channel
  // Find a guild where modmail is configured
  let targetGuild = null;
  let modmailChannelId = null;

  for (const guild of client.guilds.cache.values()) {
    const settings = db.settings[guild.id];
    if (settings && settings.modmailChannelId) {
      targetGuild = guild;
      modmailChannelId = settings.modmailChannelId;
      break;
    }
  }

  // Fallback to first guild if not explicitly configured
  if (!targetGuild) {
    targetGuild = client.guilds.cache.first();
  }

  if (!targetGuild) {
    await message.reply({
      content: '❌ Bot is not currently active in any server to route support.'
    });
    return;
  }

  const staffChannel = targetGuild.channels.cache.get(modmailChannelId) || targetGuild.systemChannel;
  if (!staffChannel) {
    await message.reply({
      content: '❌ Staff have not set up a support ticket channel yet. Please contact an admin directly.'
    });
    return;
  }

  try {
    const ticketId = `ticket_${Date.now()}`;

    // Create private or public thread in staff channel
    const thread = await staffChannel.threads.create({
      name: `ticket-${message.author.username}`,
      autoArchiveDuration: 1440,
      reason: `ModMail support ticket from ${message.author.tag}`
    });

    modmailDb.createTicket({
      ticketId,
      userId,
      guildId: targetGuild.id,
      channelId: staffChannel.id,
      threadId: thread.id
    });

    // Send initial thread header
    const initialEmbed = infoEmbed(
      `New Support Ticket • ${message.author.tag}`,
      `A new support inquiry was opened via Direct Message.\n\n` +
      `👤 **User**: ${message.author.tag} (<@${message.author.id}>)\n` +
      `🆔 **User ID**: \`${message.author.id}\`\n` +
      `💬 **Message**: "${message.content}"\n\n` +
      `*Staff can reply to this user with \`/reply <message>\` or close with \`/close [reason]\`.*`
    ).setThumbnail(message.author.displayAvatarURL());

    await thread.send({ embeds: [initialEmbed] });

    // Confirm to user in DM
    await message.reply({
      embeds: [
        successEmbed(
          'Support Ticket Opened',
          `Your message has been received by the staff team in **${targetGuild.name}**!\n` +
          `A moderator will review your inquiry and reply to you directly in this DM.\n\n` +
          `📋 **Ticket Reference**: \`${ticketId}\``
        )
      ]
    });
  } catch (err) {
    console.error('[ModMail Create Error]', err);
    await message.reply({
      content: `❌ Failed to create support ticket: ${err.message}`
    });
  }
}
