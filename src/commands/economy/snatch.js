const { SlashCommandBuilder } = require('discord.js');
const economyDb = require('../../database/economyDb');
const config = require('../../config');
const { economyEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { formatCurrency, formatDuration, randomInt } = require('../../utils/helpers');

const successScenarios = [
  'snuck up behind {target} in the bustling trading district and pulled {amount} right out of their wallet!',
  'distracted {target} with a fake high-yield investment pitch and snatched {amount} from their pocket!',
  'executed a master pickpocket maneuver while {target} was checking candlestick charts and made off with {amount}!',
  'ambushed {target} outside the exchange counter and snatched {amount} before security arrived!',
  'hacked {target}\'s unencrypted cold-storage wallet and siphon-snatched {amount} clean!'
];

const caughtScenarios = [
  '🚨 You attempted to snatch coins from **{target}**, but their personal security guard caught you red-handed! You barely escaped empty-handed.',
  '🚨 **{target}** spotted your clumsy pickpocket move and screamed for market security! You had to sprint away without any loot.',
  '🚨 The trading floor surveillance cameras flagged your suspicious behavior! You bolted into an alley before securing **{target}**\'s wallet.',
  '🚨 **{target}** turned around just as your hand slipped into their pocket! You had to drop the loot and run for your life.'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snatch')
    .setDescription('Snatch TOPT coins from another user\'s wallet (Bank Vault is immune!)')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to snatch coins from (select member or enter User ID)')
        .setRequired(true)
    ),
  aliases: ['rob', 'steal'],

  async executeSlash(interaction) {
    const robberId = interaction.user.id;
    const target = interaction.options.getUser('target');

    const validation = await validateSnatch(robberId, target, interaction.client);
    if (!validation.valid) {
      return interaction.reply({ embeds: [validation.embed], ephemeral: validation.ephemeral ?? true });
    }

    const result = economyDb.snatch(robberId, target.id);
    const embed = createSnatchEmbed(interaction.user, target, result);
    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const robberId = message.author.id;
    const target = await resolveTarget(message, args, message.client);

    const validation = await validateSnatch(robberId, target, message.client);
    if (!validation.valid) {
      return message.reply({ embeds: [validation.embed] });
    }

    const result = economyDb.snatch(robberId, target.id);
    const embed = createSnatchEmbed(message.author, target, result);
    await message.reply({ embeds: [embed] });
  }
};

async function resolveTarget(message, args, client) {
  // 1. Check direct mention
  const mentioned = message.mentions.users.first();
  if (mentioned) return mentioned;

  // 2. Check for User ID or raw mention pattern in arguments
  if (args && args.length > 0) {
    const rawTarget = args[0].replace(/[<@!>]/g, '').trim();
    if (/^\d{17,20}$/.test(rawTarget)) {
      try {
        return await client.users.fetch(rawTarget);
      } catch {
        return null;
      }
    }
  }

  return null;
}

async function validateSnatch(robberId, target, client) {
  if (!target) {
    return {
      valid: false,
      embed: errorEmbed(
        'Target Required',
        'Please tag a member or provide their Discord ID to snatch from!\n\n**Usage**:\n• `topt snatch @user`\n• `topt snatch <userId>`\n• `/snatch target:@user`'
      ),
      ephemeral: true
    };
  }

  if (target.id === robberId) {
    return {
      valid: false,
      embed: errorEmbed('Invalid Target', 'You cannot snatch money from yourself!'),
      ephemeral: true
    };
  }

  if (target.bot) {
    return {
      valid: false,
      embed: errorEmbed('Invalid Target', 'Bots do not carry wallets! You cannot snatch money from bot accounts.'),
      ephemeral: true
    };
  }

  // Check 5-minute cooldown (300s)
  const cooldownDuration = (config.economy && config.economy.snatch && config.economy.snatch.cooldown) || 300;
  const cooldownRemaining = economyDb.getCooldownRemaining(robberId, 'snatch', cooldownDuration);

  if (cooldownRemaining > 0) {
    return {
      valid: false,
      embed: errorEmbed(
        'Lay Low!',
        `⏳ You are laying low from market security! You can snatch again in **${formatDuration(cooldownRemaining)}**.`
      ),
      ephemeral: true
    };
  }

  // Check target wallet & bank protection
  const targetProfile = economyDb.getUser(target.id);
  if ((targetProfile.wallet || 0) <= 0) {
    if ((targetProfile.bank || 0) > 0) {
      return {
        valid: false,
        embed: errorEmbed(
          'Bank Vault Protected',
          `🛡️ **${target.username}** has **0 TOPT** in their wallet!\n` +
          `All their **${formatCurrency(targetProfile.bank)}** is locked in their **Bank Vault** which cannot be breached!\n\n` +
          `💡 *Tip: Deposit your coins with \`/deposit\` to stay protected against thieves.*`
        ),
        ephemeral: false
      };
    } else {
      return {
        valid: false,
        embed: errorEmbed(
          'Empty Pockets',
          `🛡️ **${target.username}** currently has **0 TOPT** in their wallet. There is nothing to snatch!`
        ),
        ephemeral: false
      };
    }
  }

  return { valid: true };
}

function createSnatchEmbed(robber, target, result) {
  if (result.success) {
    const rawTemplate = successScenarios[randomInt(0, successScenarios.length - 1)];
    const story = rawTemplate
      .replace('{target}', `**${target.username}**`)
      .replace('{amount}', `**${formatCurrency(result.stolenAmount)}**`);

    return successEmbed('💥 Heist Successful!', `🥷 **${robber.username}** ${story}`)
      .setThumbnail(robber.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💰 Snatched Amount', value: `\`+${formatCurrency(result.stolenAmount)}\``, inline: true },
        { name: '🪙 Your New Wallet', value: `\`${formatCurrency(result.robberWallet)}\``, inline: true },
        { name: '🏦 Victim Vault (Protected)', value: `\`${formatCurrency(result.victimBank)}\``, inline: true }
      )
      .setFooter({ text: '⏳ Cooldown: 5 minutes | Bank funds are 100% immune to /snatch' });
  } else {
    const rawTemplate = caughtScenarios[randomInt(0, caughtScenarios.length - 1)];
    const story = rawTemplate.replace('{target}', target.username);

    return errorEmbed('🚨 Snatch Failed!', story)
      .setThumbnail(robber.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: '⏳ Cooldown: 5 minutes | The heat is on! Lay low before trying again.' });
  }
}
