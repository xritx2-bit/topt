const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if (command.data && command.data.toJSON) {
      commands.push(command.data.toJSON());
    }
  }
}

if (!config.token || config.token === 'your_bot_token_here') {
  console.error('❌ Error: DISCORD_TOKEN is missing or not set in your .env file!');
  console.error('👉 Please edit .env and paste your bot token from the Discord Developer Portal.');
  process.exit(1);
}

if (!config.clientId || config.clientId === 'your_client_id_here') {
  console.error('❌ Error: CLIENT_ID is missing or not set in your .env file!');
  console.error('👉 Please edit .env and paste your Application/Client ID from Discord Developer Portal.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`⏳ Registering ${commands.length} application (/) slash commands...`);

    let data;
    if (config.guildId && config.guildId.trim() !== '') {
      // Guild-specific (updates instantly)
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId.trim()),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${data.length} slash commands to Guild ID: ${config.guildId}!`);
    } else {
      // Global deployment
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${data.length} slash commands globally!`);
    }
  } catch (error) {
    console.error('❌ Failed to deploy slash commands:', error);
  }
})();
