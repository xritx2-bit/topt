const { REST, Routes } = require('discord.js');
const config = require('../config');

/**
 * Automatically deploy and sync all loaded slash commands with Discord.
 * Registers to every connected guild for INSTANT visibility, and globally.
 */
async function deploySlashCommands(client) {
  const token = config.token || client?.token;
  if (!token || token === 'your_bot_token_here') {
    const msg = 'DISCORD_TOKEN is missing. Cannot register slash commands.';
    console.warn(`⚠️ [Deployer] ${msg}`);
    return { success: false, error: msg };
  }

  const clientId = config.clientId || client?.user?.id;
  if (!clientId || clientId === 'your_client_id_here') {
    const msg = 'CLIENT_ID is missing or bot user not ready yet.';
    console.warn(`⚠️ [Deployer] ${msg}`);
    return { success: false, error: msg };
  }

  if (!client.commands || client.commands.size === 0) {
    const msg = 'No slash commands loaded in client.commands Collection.';
    console.warn(`⚠️ [Deployer] ${msg}`);
    return { success: false, error: msg };
  }

  const commandsPayload = [];
  for (const cmd of client.commands.values()) {
    if (cmd.data && typeof cmd.data.toJSON === 'function') {
      commandsPayload.push(cmd.data.toJSON());
    }
  }

  console.log(`⏳ [Deployer] Registering ${commandsPayload.length} slash commands to Discord API...`);
  const rest = new REST({ version: '10' }).setToken(token);

  const results = {
    totalCommands: commandsPayload.length,
    guildsUpdated: [],
    globalUpdated: false,
    errors: []
  };

  // 1. Instant Guild-Level Registration for each guild the bot is in
  if (client.guilds && client.guilds.cache) {
    for (const guild of client.guilds.cache.values()) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guild.id),
          { body: commandsPayload }
        );
        results.guildsUpdated.push({ id: guild.id, name: guild.name });
        console.log(`⚡ [Deployer] Slash commands deployed INSTANTLY to Guild: "${guild.name}" (${guild.id})`);
      } catch (err) {
        console.warn(`⚠️ [Deployer] Could not deploy to Guild "${guild.name}": ${err.message}`);
        results.errors.push(`Guild ${guild.name}: ${err.message}`);
      }
    }
  }

  // 2. Also register to config.guildId if specified and not already updated
  if (config.guildId && config.guildId.trim()) {
    const gId = config.guildId.trim();
    const alreadyDone = results.guildsUpdated.some(g => g.id === gId);
    if (!alreadyDone) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, gId),
          { body: commandsPayload }
        );
        results.guildsUpdated.push({ id: gId, name: 'Config Guild' });
        console.log(`⚡ [Deployer] Slash commands deployed to configured GUILD_ID: ${gId}`);
      } catch (err) {
        console.warn(`⚠️ [Deployer] Could not deploy to configured GUILD_ID ${gId}: ${err.message}`);
      }
    }
  }

  // 3. Global Registration (makes them available across all servers and DMs)
  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandsPayload }
    );
    results.globalUpdated = true;
    console.log(`🌐 [Deployer] Successfully deployed ${commandsPayload.length} slash commands globally!`);
  } catch (err) {
    console.warn(`⚠️ [Deployer] Global deployment notice: ${err.message}`);
    results.errors.push(`Global: ${err.message}`);
  }

  return {
    success: results.guildsUpdated.length > 0 || results.globalUpdated,
    results
  };
}

module.exports = { deploySlashCommands };
