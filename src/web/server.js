const express = require('express');
const path = require('path');
const config = require('../config');
const db = require('../database/db');
const modmailDb = require('../database/modmailDb');
const economyDb = require('../database/economyDb');

function startWebServer(client) {
  const app = express();
  const PORT = config.port || process.env.PORT || 3000;

  // Serve static UI assets
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  // Render Web Service Health Check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now(),
      botOnline: client.isReady()
    });
  });

  // Live Stats API for Web Console
  app.get('/api/stats', (req, res) => {
    const allUsers = Object.values(db.users);
    const totalCirculation = allUsers.reduce((sum, u) => sum + (u.wallet || 0) + (u.bank || 0), 0);
    const activeTickets = modmailDb.getAllActiveTickets().length;
    const totalWarnings = db.warnings.length;
    const totalVouches = db.vouches.length;

    res.json({
      bot: {
        tag: client.user ? client.user.tag : 'Connecting...',
        avatar: client.user ? client.user.displayAvatarURL() : '',
        ping: client.ws ? Math.round(client.ws.ping) : 0,
        uptime: Math.floor(process.uptime()),
        guilds: client.guilds ? client.guilds.cache.size : 0,
        users: client.users ? client.users.cache.size : 0,
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      economy: {
        totalCirculation,
        registeredTraders: allUsers.length,
        topTraders: economyDb.getLeaderboard(5)
      },
      security: {
        activeTickets,
        totalWarnings,
        totalVouches
      }
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`🌐 [Web Console] Dashboard & Health check running on http://localhost:${PORT}`);
  });

  return server;
}

module.exports = { startWebServer };
