const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages from a channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (1 to 100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option.setName('filter_user')
        .setDescription('Only delete messages sent by this user')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  aliases: ['purge', 'clean'],

  async executeSlash(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('filter_user');

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      let toDelete = messages;

      if (filterUser) {
        toDelete = messages.filter(m => m.author.id === filterUser.id);
      }

      toDelete = Array.from(toDelete.values()).slice(0, amount);

      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      const embed = successEmbed(
        'Channel Cleared',
        `🧹 Successfully purged **${deleted.size}** message(s)${filterUser ? ` from **${filterUser.tag}**` : ''}.`
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed('Clear Failed', `Could not delete messages: ${err.message}`)]
      });
    }
  }
};
