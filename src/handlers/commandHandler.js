const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

function loadCommands(client) {
  client.commands = new Collection();
  client.prefixCommands = new Collection();

  const commandsPath = path.join(__dirname, '../commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);

      if (command.data && command.data.name) {
        // Register slash command
        client.commands.set(command.data.name, command);

        // Register prefix command name & aliases
        if (typeof command.executePrefix === 'function') {
          client.prefixCommands.set(command.data.name.toLowerCase(), command);

          if (Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
              client.prefixCommands.set(alias.toLowerCase(), command);
            });
          }
        }
      } else {
        console.warn(`[Command Loader] Skipping ${filePath} (missing data.name)`);
      }
    }
  }

  console.log(`[Commands] Successfully loaded ${client.commands.size} slash commands and ${client.prefixCommands.size} prefix triggers.`);
}

module.exports = { loadCommands };
