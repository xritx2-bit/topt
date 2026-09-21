const { deploySlashCommands } = require('../utils/deployer');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    console.log(`🎉 [Guild] Joined new server: "${guild.name}" (ID: ${guild.id}) with ${guild.memberCount} members`);
    try {
      await deploySlashCommands(client);
      console.log(`⚡ [Guild] Instantly deployed all slash commands to "${guild.name}"!`);
    } catch (err) {
      console.warn(`⚠️ [Guild] Failed to deploy slash commands to new guild: ${err.message}`);
    }
  }
};
