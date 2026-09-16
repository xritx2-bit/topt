const { ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`========================================`);
    console.log(`🤖 Logged in as: ${client.user.tag}`);
    console.log(`🌐 Active across: ${client.guilds.cache.size} server(s)`);
    console.log(`🪙 Currency Name: ${config.currency.name} (${config.currency.symbol})`);
    console.log(`💬 Prefix: ${config.prefix} (or ${config.altPrefix})`);
    console.log(`========================================`);

    // Set dynamic activity presence
    client.user.setPresence({
      activities: [
        {
          name: `${config.prefix} help | ${config.currency.name} Economy`,
          type: ActivityType.Playing
        }
      ],
      status: 'online'
    });
  }
};
