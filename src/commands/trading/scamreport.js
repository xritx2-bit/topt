const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scamreport')
    .setDescription('Report a suspected scammer or trade dispute to server moderators')
    .addUserOption(option =>
      option.setName('suspect')
        .setDescription('The member suspected of scamming')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('details')
        .setDescription('Describe what happened in detail')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Link to screenshots or transaction hash')
        .setRequired(false)
    ),
  aliases: ['reportscam', 'scam'],

  async executeSlash(interaction) {
    const suspect = interaction.options.getUser('suspect');
    const details = interaction.options.getString('details');
    const evidence = interaction.options.getString('evidence') || 'None provided';

    const alertEmbed = errorEmbed(
      '🚨 SCAMMER ALERT FILED',
      `An urgent trade dispute/scam report has been submitted.\n`
    ).addFields(
      { name: '⚠️ Suspect', value: `${suspect.tag} (<@${suspect.id}>)`, inline: true },
      { name: '📢 Reporter', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
      { name: '📝 Incident Details', value: details, inline: false },
      { name: '🔗 Evidence', value: evidence, inline: false }
    );

    // Send public alert in channel
    await interaction.reply({ embeds: [alertEmbed] });
  },

  async executePrefix(message, args) {
    const suspect = message.mentions.users.first();
    if (!suspect) {
      return message.reply({
        embeds: [errorEmbed('Usage Help', 'Usage: `topt scamreport @suspect <details>`')]
      });
    }

    const details = args.slice(1).join(' ') || 'No details provided';

    const alertEmbed = errorEmbed(
      '🚨 SCAMMER ALERT FILED',
      `An urgent trade dispute/scam report has been submitted.\n`
    ).addFields(
      { name: '⚠️ Suspect', value: `${suspect.tag} (<@${suspect.id}>)`, inline: true },
      { name: '📢 Reporter', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
      { name: '📝 Incident Details', value: details, inline: false }
    );

    await message.reply({ embeds: [alertEmbed] });
  }
};
