const { SlashCommandBuilder } = require('discord.js');
const repDb = require('../../database/repDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Leave a positive or negative trade reputation review for a trader')
    .addUserOption(option =>
      option.setName('trader')
        .setDescription('The trader you traded with')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('rating')
        .setDescription('Was the trade positive or negative?')
        .setRequired(true)
        .addChoices(
          { name: '🟢 +1 Positive (Legit / Successful Trade)', value: 1 },
          { name: '🔴 -1 Negative (Scam / Problematic Trade)', value: -1 }
        )
    )
    .addStringOption(option =>
      option.setName('comment')
        .setDescription('Details about the transaction (e.g. Bought 500k TOPT, smooth & instant)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('proof')
        .setDescription('Optional screenshot or transaction proof link')
        .setRequired(false)
    ),
  aliases: ['rep+'],

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('trader');
    const type = interaction.options.getInteger('rating');
    const comment = interaction.options.getString('comment');
    const proof = interaction.options.getString('proof') || '';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Vouch', 'You cannot vouch for yourself!')],
        ephemeral: true
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Vouch', 'You cannot vouch for bot accounts!')],
        ephemeral: true
      });
    }

    const result = repDb.addVouch({
      targetId: targetUser.id,
      authorId: interaction.user.id,
      type,
      comment,
      proof
    });

    const isPositive = type === 1;
    const embed = (isPositive ? successEmbed : errorEmbed)(
      isPositive ? 'Trade Vouch Submitted (+1)' : 'Negative Feedback Submitted (-1)',
      `**Trader**: <@${targetUser.id}>\n` +
      `**Reviewer**: <@${interaction.user.id}>\n` +
      `**Rating**: ${isPositive ? '🟢 **Positive (+1)**' : '🔴 **Negative (-1)**'}\n` +
      `**Notes**: "${comment}"` +
      (proof ? `\n**Proof**: [View Evidence](${proof})` : '')
    );

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt vouch @trader <+1|-1> <comment>`\nExample: `topt vouch @user +1 Quick and legit crypto trade!`')]
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({
        embeds: [errorEmbed('Invalid Vouch', 'You cannot vouch for yourself!')]
      });
    }

    if (targetUser.bot) {
      return message.reply({
        embeds: [errorEmbed('Invalid Vouch', 'You cannot vouch for bot accounts!')]
      });
    }

    // Parse rating (+1 or -1)
    const ratingArg = args[1] || '+1';
    const type = (ratingArg.includes('-') || ratingArg === '-1') ? -1 : 1;

    // Remaining arguments form the comment
    const commentWords = args.slice(2);
    const comment = commentWords.join(' ') || 'Legit trade';

    repDb.addVouch({
      targetId: targetUser.id,
      authorId: message.author.id,
      type,
      comment,
      proof: ''
    });

    const isPositive = type === 1;
    const embed = (isPositive ? successEmbed : errorEmbed)(
      isPositive ? 'Trade Vouch Submitted (+1)' : 'Negative Feedback Submitted (-1)',
      `**Trader**: <@${targetUser.id}>\n` +
      `**Reviewer**: <@${message.author.id}>\n` +
      `**Rating**: ${isPositive ? '🟢 **Positive (+1)**' : '🔴 **Negative (-1)**'}\n` +
      `**Notes**: "${comment}"`
    );

    await message.reply({ embeds: [embed] });
  }
};
