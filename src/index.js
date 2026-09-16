const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { loadCommands } = require('./handlers/commandHandler');
const { startWebServer } = require('./web/server');

console.log(`🚀 Starting ${config.botName || 'TOPT ENGINE'}...`);

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

// Launch Web Console & Health Check server for Render
startWebServer(client);

// Load all slash and prefix commands
loadCommands(client);

// Load and bind event listeners
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Check for token before logging in
if (!config.token || config.token === 'your_bot_token_here') {
  console.error('\n⚠️ ======================================================== ⚠️');
  console.error('DISCORD_TOKEN is missing or not set in your .env file!');
  console.error('');
  console.error('To run your bot:');
  console.error('1. Open https://discord.com/developers/applications');
  console.error('2. Create an Application, go to the "Bot" tab, and copy your Token');
  console.error('3. Make sure "Message Content Intent" & "Server Members Intent" are toggled ON');
  console.error('4. Open the .env file in this directory and paste your Token:');
  console.error('   DISCORD_TOKEN=your_token_here');
  console.error('   CLIENT_ID=your_client_id_here');
  console.error('5. Run: npm run deploy');
  console.error('6. Run: npm start');
  console.error('⚠️ ======================================================== ⚠️\n');
  process.exit(1);
}

// Log in to Discord
client.login(config.token).catch(err => {
  console.error('❌ Failed to login to Discord:', err.message);
  console.error('Please verify that your DISCORD_TOKEN in .env is valid.');
});
