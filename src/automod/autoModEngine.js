const automodDb = require('../database/automodDb');
const warnDb = require('../database/warnDb');
const { errorEmbed } = require('../utils/embeds');

// In-memory spam tracker: Map<userId, Array<timestamp>>
const messageTracker = new Map();

// Allowed domains for anti-link filter
const allowedDomains = ['tenor.com', 'giphy.com', 'youtube.com', 'youtu.be', 'discord.com/channels'];

async function checkMessage(message) {
  if (!message.guild || message.author.bot) return { blocked: false };

  // Skip Bot Master / Superusers
  const { isBotSuperUser } = require('../utils/permissions');
  if (isBotSuperUser(message.author.id)) return { blocked: false };

  // Skip administrators and members with ManageMessages
  if (message.member && (message.member.permissions.has('Administrator') || message.member.permissions.has('ManageMessages'))) {
    return { blocked: false };
  }

  const config = automodDb.getAutoModConfig(message.guild.id);
  const content = message.content.toLowerCase();

  // 1. Check Anti-Invite
  if (config.antiInvite) {
    const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/i;
    if (inviteRegex.test(message.content)) {
      await penalizeUser(message, 'Posting unauthorized Discord invite links');
      return { blocked: true, reason: 'Anti-Invite Violation' };
    }
  }

  // 2. Check Banned Words & Scam Phrases
  if (Array.isArray(config.bannedWords)) {
    for (const word of config.bannedWords) {
      if (word && content.includes(word.toLowerCase())) {
        await penalizeUser(message, `Using blacklisted phrase: "${word}"`);
        return { blocked: true, reason: 'Blacklisted Word Violation' };
      }
    }
  }

  // 3. Check Anti-Mention Spam
  if (message.mentions.users.size > (config.maxMentions || 5)) {
    await penalizeUser(message, `Mass mention spam (${message.mentions.users.size} mentions)`);
    return { blocked: true, reason: 'Mass Mention Spam' };
  }

  // 4. Check Anti-Link (if enabled)
  if (config.antiLink) {
    const linkRegex = /(https?:\/\/[^\s]+)/i;
    if (linkRegex.test(message.content)) {
      const isAllowed = allowedDomains.some(d => message.content.includes(d));
      if (!isAllowed) {
        await penalizeUser(message, 'Posting unauthorized external links');
        return { blocked: true, reason: 'Anti-Link Violation' };
      }
    }
  }

  // 5. Check Anti-Spam (Rapid message flood)
  if (config.antiSpam) {
    const now = Date.now();
    const userId = message.author.id;
    let userMessages = messageTracker.get(userId) || [];

    // Filter out messages older than 4 seconds
    userMessages = userMessages.filter(timestamp => now - timestamp < 4000);
    userMessages.push(now);
    messageTracker.set(userId, userMessages);

    if (userMessages.length > 5) {
      messageTracker.delete(userId);
      await penalizeUser(message, 'Flooding the chat with spam messages');
      // Apply 5-minute timeout if bot has permissions
      if (message.member && message.member.moderatable) {
        await message.member.timeout(5 * 60 * 1000, 'AutoMod: Chat Flood Protection').catch(() => {});
      }
      return { blocked: true, reason: 'Chat Flood Spam' };
    }
  }

  return { blocked: false };
}

async function penalizeUser(message, reason) {
  // Delete the offending message
  await message.delete().catch(() => {});

  // Send temporary warning alert to channel (auto-delete after 5s)
  const warnMsg = await message.channel.send({
    content: `⚠️ <@${message.author.id}>, your message was deleted by **AutoMod**: *${reason}*.`
  }).catch(() => null);

  if (warnMsg) {
    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
  }

  // Log formal warning in DB
  warnDb.addWarning({
    guildId: message.guild.id,
    userId: message.author.id,
    moderatorId: message.client.user.id,
    reason: `AutoMod: ${reason}`
  });

  // Notify user via DM
  await message.author.send({
    embeds: [
      errorEmbed(
        'AutoMod Warning',
        `Your message in **${message.guild.name}** was removed by AutoMod.\n**Reason**: ${reason}`
      )
    ]
  }).catch(() => {});
}

module.exports = { checkMessage };
