const config = require('../config');

/**
 * Checks if a Discord user ID is a Bot Superuser / Master Admin
 */
function isBotSuperUser(userId) {
  if (!userId) return false;
  const idStr = String(userId).trim();
  const owners = Array.isArray(config.botOwners) ? config.botOwners : ['1399710243071725679'];
  return owners.includes(idStr) || idStr === '1399710243071725679';
}

/**
 * Check if the user is authorized to perform Admin / Owner level actions
 */
function checkAdminPermission(interaction) {
  if (!interaction) return false;
  const userId = interaction.user ? interaction.user.id : interaction.author?.id;
  if (isBotSuperUser(userId)) return true;
  if (interaction.guild && interaction.guild.ownerId === userId) return true;
  if (interaction.member && interaction.member.permissions) {
    if (interaction.member.permissions.has('Administrator')) return true;
    if (interaction.member.permissions.has('ManageGuild')) return true;
  }
  return false;
}

/**
 * Check if the user is authorized to perform Moderator level actions
 */
function checkModPermission(interaction) {
  if (!interaction) return false;
  const userId = interaction.user ? interaction.user.id : interaction.author?.id;
  if (isBotSuperUser(userId)) return true;
  if (interaction.guild && interaction.guild.ownerId === userId) return true;
  if (interaction.member && interaction.member.permissions) {
    if (interaction.member.permissions.has('Administrator')) return true;
    if (interaction.member.permissions.has('ManageGuild')) return true;
    if (interaction.member.permissions.has('ModerateMembers')) return true;
    if (interaction.member.permissions.has('ManageMessages')) return true;
    if (interaction.member.permissions.has('KickMembers')) return true;
    if (interaction.member.permissions.has('BanMembers')) return true;
  }
  return false;
}

module.exports = {
  isBotSuperUser,
  checkAdminPermission,
  checkModPermission
};
