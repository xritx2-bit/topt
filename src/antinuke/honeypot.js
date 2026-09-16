const antinukeDb = require('../database/antinukeDb');
const { errorEmbed } = require('../utils/embeds');

async function checkHoneypot(message) {
  if (!message.guild || message.author.bot) return false;

  const config = antinukeDb.getAntiNukeConfig(message.guild.id);
  if (!config.honeypotChannelId || message.channel.id !== config.honeypotChannelId) {
    return false;
  }

  // Exempt server owner and whitelisted staff
  if (antinukeDb.isWhitelisted(message.guild.id, message.author.id, message.guild.ownerId)) {
    return false;
  }

  console.warn(`[HONEYPOT TRAP] Raid bot / unauthorized user triggered honeypot: ${message.author.tag}`);

  // Delete offending message
  await message.delete().catch(() => {});

  // Ban the raid bot immediately
  if (message.member && message.member.bannable) {
    await message.member.ban({ reason: 'Honeypot Trap Triggered: Automated raid bot detection' }).catch(() => {});
  }

  // Send warning log to system channel or owner
  const owner = await message.guild.fetchOwner().catch(() => null);
  if (owner) {
    await owner.send({
      embeds: [
        errorEmbed(
          '🪤 HONEYPOT TRAP CAPTURED A BOT',
          `A raid bot or unauthorized user posted inside your **#honeypot** trap channel in **${message.guild.name}**!\n\n` +
          `👤 **Offender**: ${message.author.tag} (<@${message.author.id}>)\n` +
          `💬 **Message**: "${message.content.slice(0, 100)}"\n` +
          `🛡️ **Action**: The account was instantly banned on sight.`
        )
      ]
    }).catch(() => {});
  }

  return true;
}

module.exports = { checkHoneypot };
