const selfRoleDb = require('../database/selfRoleDb');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[Command Error] No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.executeSlash(interaction);
      } catch (error) {
        console.error(`[Execution Error] Command /${interaction.commandName} failed:`, error);
        const errPayload = {
          embeds: [errorEmbed('Command Error', 'An unexpected error occurred while executing this command.')],
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errPayload).catch(() => {});
        } else {
          await interaction.reply(errPayload).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Self-Role Button Clicks
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith('sr_')) {
        const selfRole = selfRoleDb.getSelfRole(customId);
        if (!selfRole) {
          return interaction.reply({
            embeds: [errorEmbed('Role Not Found', 'This self-role configuration is no longer active.')],
            ephemeral: true
          });
        }

        const role = interaction.guild.roles.cache.get(selfRole.roleId);
        if (!role) {
          return interaction.reply({
            embeds: [errorEmbed('Role Not Found', 'The associated role no longer exists on this server.')],
            ephemeral: true
          });
        }

        const member = interaction.member;
        const botMember = interaction.guild.members.me;

        if (!botMember.permissions.has('ManageRoles') || role.comparePositionTo(botMember.roles.highest) >= 0) {
          return interaction.reply({
            embeds: [errorEmbed('Permission Error', 'I do not have high enough role permissions to grant or remove this role!')],
            ephemeral: true
          });
        }

        try {
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            return interaction.reply({
              embeds: [successEmbed('Role Removed', `❌ Removed the **${role.name}** role from your profile.`)],
              ephemeral: true
            });
          } else {
            await member.roles.add(role);
            return interaction.reply({
              embeds: [successEmbed('Role Assigned', `✅ Granted the **${role.name}** role to your profile!`)],
              ephemeral: true
            });
          }
        } catch (err) {
          console.error('[Self-Role Error]', err);
          return interaction.reply({
            embeds: [errorEmbed('Role Error', `Failed to update roles: ${err.message}`)],
            ephemeral: true
          });
        }
      }
    }
  }
};
