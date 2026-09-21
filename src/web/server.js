const express = require('express');
const path = require('path');
const config = require('../config');
const db = require('../database/db');
const modmailDb = require('../database/modmailDb');
const economyDb = require('../database/economyDb');
const automodDb = require('../database/automodDb');
const antinukeDb = require('../database/antinukeDb');
const { infoEmbed, successEmbed, errorEmbed } = require('../utils/embeds');
const {
  startKeepAlive,
  getKeepAliveStatus,
  sendPing,
  resolveKeepAliveUrl,
  formatHealthUrl
} = require('../utils/keepAlive');
const { deploySlashCommands } = require('../utils/deployer');

// Recent system log cache for web console streaming
const recentLogs = [
  { id: 1, type: 'SYSTEM', message: 'TOPT ENGINE Core Online & Initialized', time: Date.now() - 60000 },
  { id: 2, type: 'SECURITY', message: 'Anti-Nuke Guardian & Honeypot armed on all channels', time: Date.now() - 50000 },
  { id: 3, type: 'MODMAIL', message: 'Abyss-style DM Ticket Dispatcher active', time: Date.now() - 40000 },
  { id: 4, type: 'ECONOMY', message: 'TOPT Currency Liquidity Pool synced', time: Date.now() - 30000 }
];

function getFirstGuild(client) {
  if (!client.guilds || !client.guilds.cache) return null;
  return client.guilds.cache.first ? client.guilds.cache.first() : Array.from(client.guilds.cache.values())[0] || null;
}

function logEvent(type, message) {
  recentLogs.unshift({
    id: Date.now() + Math.random(),
    type,
    message,
    time: Date.now()
  });
  if (recentLogs.length > 100) recentLogs.pop();
}

function startWebServer(client) {
  const app = express();
  const PORT = config.port || process.env.PORT || 3000;

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  // Resiliency fallback: if an uptime monitor accidentally requests a nested or duplicated URL (e.g. /https://...)
  app.use((req, res, next) => {
    if (req.path.startsWith('/http:') || req.path.startsWith('/https:') || req.path.includes('onrender.com')) {
      const keepAlive = getKeepAliveStatus();
      return res.status(200).json({
        status: 'ok',
        note: 'Fallback health response for malformed or duplicated URL',
        botName: config.botName || 'TOPT ENGINE',
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now(),
        botOnline: client.isReady(),
        keepAlive
      });
    }
    next();
  });

  // Health Check for Render & Uptime Monitors
  app.get('/health', (req, res) => {
    const keepAlive = getKeepAliveStatus();
    res.status(200).json({
      status: 'ok',
      botName: config.botName || 'TOPT ENGINE',
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now(),
      botOnline: client.isReady(),
      keepAlive: {
        active: keepAlive.active,
        targetUrl: keepAlive.targetUrl,
        intervalMinutes: keepAlive.intervalMinutes,
        pingCount: keepAlive.pingCount,
        lastPingTime: keepAlive.lastPingTime,
        lastPingStatus: keepAlive.lastPingStatus,
        lastLatencyMs: keepAlive.lastLatencyMs
      }
    });
  });

  // Comprehensive System Stats
  app.get('/api/stats', (req, res) => {
    const allUsers = Object.values(db.users);
    const totalCirculation = allUsers.reduce((sum, u) => sum + (u.wallet || 0) + (u.bank || 0), 0);
    const activeTickets = modmailDb.getAllActiveTickets();
    const totalWarnings = db.warnings.length;
    const totalVouches = db.vouches.length;

    // First guild settings for control panel
    const firstGuild = client.guilds?.cache?.first ? client.guilds.cache.first() : (client.guilds?.cache ? Array.from(client.guilds.cache.values())[0] : null);
    const guildId = firstGuild ? firstGuild.id : null;
    const automodConfig = guildId ? automodDb.getAutoModConfig(guildId) : config.automod;
    const antinukeConfig = guildId ? antinukeDb.getAntiNukeConfig(guildId) : config.antinuke;
    const detectedUrl = resolveKeepAliveUrl() || (req.headers.host ? `${req.protocol}://${req.headers.host}` : null);
    const healthUrl = formatHealthUrl(detectedUrl);

    res.json({
      bot: {
        name: config.botName || 'TOPT ENGINE',
        tag: client.user ? client.user.tag : 'TOPT ENGINE (Connecting...)',
        avatar: client.user ? client.user.displayAvatarURL() : '',
        ping: client.ws ? Math.round(client.ws.ping) : 0,
        uptime: Math.floor(process.uptime()),
        guilds: client.guilds ? client.guilds.cache.size : 0,
        users: client.users ? client.users.cache.size : 0,
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        threatLevel: antinukeConfig.enabled ? 'SECURE' : 'CAUTION'
      },
      keepAlive: {
        ...getKeepAliveStatus(),
        healthUrl
      },
      economy: {
        totalCirculation,
        registeredTraders: allUsers.length,
        topTraders: economyDb.getLeaderboard(10)
      },
      security: {
        activeTickets: activeTickets.length,
        totalWarnings,
        totalVouches,
        automod: automodConfig,
        antinuke: antinukeConfig
      },
      logs: recentLogs.slice(0, 30)
    });
  });

  // TOPT Market Price & Candlestick History
  app.get('/api/market', (req, res) => {
    const allUsers = Object.values(db.users);
    const totalCirculation = allUsers.reduce((sum, u) => sum + (u.wallet || 0) + (u.bank || 0), 0);
    const basePrice = 1.25;

    // Generate dynamic chart data points based on time
    const now = Math.floor(Date.now() / 1000);
    const points = [];
    let current = basePrice;

    for (let i = 24; i >= 0; i--) {
      const time = now - (i * 3600);
      const wave = Math.sin(time / 10000) * 0.15;
      const noise = ((time % 17) - 8) * 0.02;
      current = Math.max(0.5, parseFloat((basePrice + wave + noise).toFixed(4)));
      points.push({
        time: new Date(time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: current,
        volume: Math.floor(totalCirculation * 0.04 + (Math.abs(noise) * 50000))
      });
    }

    res.json({
      symbol: 'TOPT/USD',
      currentPrice: points[points.length - 1].price,
      high24h: Math.max(...points.map(p => p.price)),
      low24h: Math.min(...points.map(p => p.price)),
      volume24h: points.reduce((acc, p) => acc + p.volume, 0),
      marketCap: Math.floor(totalCirculation * points[points.length - 1].price),
      history: points
    });
  });

  // ModMail Tickets List
  app.get('/api/tickets', (req, res) => {
    const tickets = Object.values(db.tickets);
    res.json(tickets);
  });

  // Helper: Resolve Discord user from @mention, username, nickname, or Snowflake ID
  async function resolveTargetUser(input, client) {
    if (!input) return null;
    let clean = input.trim();

    // Strip mention tags e.g. <@!123456789> or <@123456789>
    const mentionMatch = clean.match(/^<@!?(\d{17,20})>$/);
    if (mentionMatch) {
      const id = mentionMatch[1];
      let tag = id;
      try {
        const u = await client.users?.fetch?.(id).catch(() => null);
        if (u) tag = u.tag || u.username;
      } catch {}
      return { id, tag };
    }

    // Pure numeric Discord snowflake ID
    if (/^\d{17,20}$/.test(clean)) {
      let tag = clean;
      try {
        const u = await client.users?.fetch?.(clean).catch(() => null);
        if (u) tag = u.tag || u.username;
      } catch {}
      return { id: clean, tag };
    }

    // Search by username / tag / nickname
    const searchName = clean.replace(/^@/, '').toLowerCase();

    // Search in connected guilds member caches
    if (client.guilds && client.guilds.cache) {
      const guildList = Array.from(client.guilds.cache.values ? client.guilds.cache.values() : []);
      for (const guild of guildList) {
        if (!guild.members || !guild.members.cache) continue;
        const membersList = Array.from(guild.members.cache.values ? guild.members.cache.values() : []);
        const member = membersList.find(m =>
          (m.user?.username && m.user.username.toLowerCase() === searchName) ||
          (m.user?.tag && m.user.tag.toLowerCase() === searchName) ||
          (m.nickname && m.nickname.toLowerCase() === searchName)
        );
        if (member) {
          return { id: member.id, tag: member.user?.tag || member.user?.username || member.id };
        }
      }
    }

    // Search in global client users cache
    if (client.users && client.users.cache) {
      const userList = Array.from(client.users.cache.values ? client.users.cache.values() : []);
      const u = userList.find(user =>
        (user.username && user.username.toLowerCase() === searchName) ||
        (user.tag && user.tag.toLowerCase() === searchName)
      );
      if (u) return { id: u.id, tag: u.tag || u.username || u.id };
    }

    // Search in database known users
    const dbEntry = Object.values(db.users).find(user =>
      (user.username && user.username.toLowerCase() === searchName) ||
      (user.tag && user.tag.toLowerCase() === searchName)
    );
    if (dbEntry) {
      return { id: dbEntry.userId, tag: dbEntry.tag || dbEntry.username || dbEntry.userId };
    }

    // Fallback: If input contains any 17-20 digit sequence
    const fallbackDigits = clean.match(/\d{17,20}/);
    if (fallbackDigits) {
      return { id: fallbackDigits[0], tag: fallbackDigits[0] };
    }

    return null;
  }

  // Interactive Web Terminal Command Execution
  app.post('/api/terminal', async (req, res) => {
    const rawCmd = (req.body.command || '').trim();
    if (!rawCmd) {
      return res.json({ success: false, output: 'No command provided.' });
    }

    const parts = rawCmd.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    logEvent('TERMINAL', `Executed: ${rawCmd}`);

    switch (cmd) {
      case 'help':
        return res.json({
          success: true,
          output: [
            '====================================================',
            '⚡ TOPT ENGINE Cyber Command Terminal — Available Commands:',
            '====================================================',
            '  status            - Inspect live engine vitals and memory',
            '  stats             - Display economy & market metrics',
            '  tickets           - List all open ModMail tickets',
            '  threat            - Display current Anti-Nuke and Honeypot status',
            '  servers           - List connected Discord servers',
            '  keepalive         - Inspect 24/7 keep-alive pulse & uptime sentinel',
            '  pingpulse         - Send an immediate keep-alive pulse to health URL',
            '  deploy            - Force sync all 38 slash commands to Discord servers',
            '  give <user> <amt> - Credit TOPT currency (supports @mention, username, or ID)',
            '  balance <user>    - Check user wallet and bank balance',
            '  broadcast <msg>   - Send an announcement to server',
            '  cls / clear       - Clear terminal output',
            '  ping              - Test gateway WebSocket latency',
            '===================================================='
          ].join('\n')
        });

      case 'status':
        const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
        const ping = client.ws ? Math.round(client.ws.ping) : 0;
        return res.json({
          success: true,
          output: `[STATUS] Engine: ONLINE | Ping: ${ping}ms | Memory: ${mem}MB | Uptime: ${Math.floor(process.uptime())}s | Servers: ${client.guilds.cache.size}`
        });

      case 'stats':
        const users = Object.values(db.users);
        const totalCoins = users.reduce((s, u) => s + (u.wallet || 0) + (u.bank || 0), 0);
        return res.json({
          success: true,
          output: `[ECONOMY] Registered Accounts: ${users.length} | Circulating TOPT: 🪙 ${totalCoins.toLocaleString()} | Vouches: ${db.vouches.length} | Warnings: ${db.warnings.length}`
        });

      case 'tickets':
        const openTickets = modmailDb.getAllActiveTickets();
        if (openTickets.length === 0) {
          return res.json({ success: true, output: '[MODMAIL] No open support tickets currently.' });
        }
        const ticketList = openTickets.map(t => `• ID: ${t.ticketId} | User: ${t.userId} | Thread: ${t.threadId}`).join('\n');
        return res.json({ success: true, output: `[MODMAIL] Open Tickets (${openTickets.length}):\n${ticketList}` });

      case 'threat':
        const g = getFirstGuild(client);
        const nukeConf = g ? antinukeDb.getAntiNukeConfig(g.id) : config.antinuke;
        return res.json({
          success: true,
          output: `[SECURITY] Anti-Nuke: ${nukeConf.enabled ? 'ACTIVE' : 'DISABLED'} | Honeypot: ${nukeConf.honeypotChannelId || 'None'} | Whitelist: ${nukeConf.whitelist?.length || 0} accounts`
        });

      case 'keepalive':
      case 'uptime':
        const ka = getKeepAliveStatus();
        const effectiveUrl = ka.targetUrl || formatHealthUrl(resolveKeepAliveUrl());
        return res.json({
          success: true,
          output: [
            '====================================================',
            '💓 24/7 KEEP-ALIVE & SENTINEL PULSE DIAGNOSTICS',
            '====================================================',
            `  Status:          ${ka.active ? '🟢 ACTIVE (Self-Pinging)' : '🟡 STANDBY (Awaiting Public URL)'}`,
            `  Target URL:      ${effectiveUrl || 'Not configured'}`,
            `  Interval:        Every ${ka.intervalMinutes} minutes (< 15m Render limit)`,
            `  Pings Delivered: ${ka.pingCount}`,
            `  Last Status:     ${ka.lastPingStatus}`,
            `  Last Latency:    ${ka.lastLatencyMs}ms`,
            `  Last Pulse:      ${ka.lastPingTime ? new Date(ka.lastPingTime).toLocaleTimeString() : 'None yet'}`,
            `  Next Pulse:      ${ka.nextPingTime ? new Date(ka.nextPingTime).toLocaleTimeString() : 'Pending'}`,
            '----------------------------------------------------',
            '📌 TIP: For 100% 24/7 uptime without sleep, also add',
            `   URL: ${effectiveUrl || 'https://<your-render-app>.onrender.com/health'}`,
            '   to free UptimeRobot (https://uptimerobot.com)',
            '===================================================='
          ].join('\n')
        });

      case 'pingpulse':
        logEvent('KEEPALIVE', 'Manual sentinel pulse triggered from terminal');
        const pRes = await sendPing();
        if (pRes && pRes.success) {
          return res.json({ success: true, output: `[PULSE] Success! HTTP ${pRes.status} received in ${pRes.latency}ms.` });
        } else {
          return res.json({ success: false, output: `[PULSE FAILED] ${pRes?.error || 'No response or no URL configured'}` });
        }

      case 'ping':
        return res.json({ success: true, output: `[PONG] WebSocket Latency: ${client.ws ? Math.round(client.ws.ping) : 0}ms` });

      case 'give': {
        // Filter out extraneous words like "topt", "currency", "to", "coins"
        const cleanArgs = args.filter(a => !['topt', 'currency', 'to', 'coins', 't'].includes(a.toLowerCase()));
        if (cleanArgs.length < 2) {
          return res.json({
            success: false,
            output: [
              '⚠️ Usage: give <user/username/@mention/id> <amount>',
              'Examples:',
              '  give @username 5000',
              '  give username 5000',
              '  give 123456789012345678 5000',
              '  give 5000 @username'
            ].join('\n')
          });
        }

        let targetInput = cleanArgs[0];
        let amt = parseInt(cleanArgs[1], 10);

        // Allow reversed argument order e.g. "give 5000 @username"
        if (isNaN(amt) && !isNaN(parseInt(cleanArgs[0], 10))) {
          amt = parseInt(cleanArgs[0], 10);
          targetInput = cleanArgs[1];
        }

        if (isNaN(amt) || amt <= 0) {
          return res.json({ success: false, output: `Invalid amount: "${cleanArgs[1]}". Please specify a positive number.` });
        }

        const resolved = await resolveTargetUser(targetInput, client);
        if (!resolved) {
          return res.json({
            success: false,
            output: `❌ Could not find Discord user "${targetInput}".\nPlease provide their @mention, username, or Discord User ID (e.g. 123456789012345678).`
          });
        }

        const userAcc = economyDb.addWallet(resolved.id, amt);
        if (resolved.tag && resolved.tag !== resolved.id) {
          userAcc.tag = resolved.tag;
          db.save('users');
        }

        logEvent('ECONOMY', `Console credited ${amt} TOPT to ${resolved.tag} (${resolved.id})`);
        return res.json({
          success: true,
          output: [
            `✅ [SUCCESS] Credited 🪙 ${amt.toLocaleString()} TOPT to ${resolved.tag}!`,
            `   User ID:        ${resolved.id}`,
            `   Wallet Balance: 🪙 ${userAcc.wallet.toLocaleString()} TOPT`,
            `   Bank Balance:   🪙 ${userAcc.bank.toLocaleString()} TOPT`,
            `   Net Worth:      🪙 ${(userAcc.wallet + userAcc.bank).toLocaleString()} TOPT`
          ].join('\n')
        });
      }

      case 'balance':
      case 'bal':
      case 'cash': {
        const cleanArgs = args.filter(a => !['topt', 'currency', 'of'].includes(a.toLowerCase()));
        if (cleanArgs.length === 0) {
          return res.json({ success: false, output: 'Usage: balance <@user/username/userId>' });
        }
        const resolved = await resolveTargetUser(cleanArgs[0], client);
        if (!resolved) {
          return res.json({ success: false, output: `❌ User "${cleanArgs[0]}" not found.` });
        }
        const userAcc = economyDb.getUser(resolved.id);
        return res.json({
          success: true,
          output: [
            `💳 Account Profile: ${resolved.tag} (${resolved.id})`,
            `   Wallet:    🪙 ${userAcc.wallet.toLocaleString()} TOPT`,
            `   Bank:      🪙 ${userAcc.bank.toLocaleString()} TOPT`,
            `   Net Worth: 🪙 ${(userAcc.wallet + userAcc.bank).toLocaleString()} TOPT`,
            `   Streak:    🔥 ${userAcc.dailyStreak || 0} days`
          ].join('\n')
        });
      }

      case 'deploy':
      case 'syncslash': {
        logEvent('SYSTEM', 'Manual slash command deployment triggered from web console');
        const dRes = await deploySlashCommands(client);
        if (dRes.success) {
          const guildList = (dRes.results.guildsUpdated || []).map(g => `  • ${g.name} (${g.id})`).join('\n');
          return res.json({
            success: true,
            output: [
              '====================================================',
              `⚡ [DEPLOY SUCCESS] ${dRes.results.totalCommands} Slash Commands Synchronized!`,
              '====================================================',
              `  Guilds Updated Instantly: ${dRes.results.guildsUpdated.length}`,
              guildList ? guildList : '  (No connected servers yet)',
              `  Global Registration:      ${dRes.results.globalUpdated ? 'SUCCESS (Active globally)' : 'Pending'}`,
              '----------------------------------------------------',
              '👉 Slash commands (/) should now appear immediately in your Discord server!',
              '===================================================='
            ].join('\n')
          });
        } else {
          return res.json({
            success: false,
            output: `❌ Slash command deployment failed: ${dRes.error || dRes.results?.errors?.join(', ') || 'Unknown error'}`
          });
        }
      }

      case 'servers':
      case 'guilds': {
        const guildList = client.guilds?.cache ? Array.from(client.guilds.cache.values()) : [];
        if (guildList.length === 0) {
          return res.json({ success: true, output: '⚠️ The bot is not currently connected to any Discord servers.' });
        }
        const out = guildList.map((g, i) => `  ${i + 1}. "${g.name}" (ID: ${g.id}) • ${g.memberCount} members`).join('\n');
        return res.json({
          success: true,
          output: `🌐 Connected Discord Servers (${guildList.length}):\n${out}`
        });
      }

      case 'broadcast':
        const messageText = args.join(' ');
        if (!messageText) return res.json({ success: false, output: 'Usage: broadcast <message text>' });
        const targetGuild = getFirstGuild(client);
        if (!targetGuild) return res.json({ success: false, output: 'No connected servers found to broadcast to.' });
        const channel = targetGuild.systemChannel || (targetGuild.channels?.cache ? Array.from(targetGuild.channels.cache.values()).find(c => c.isTextBased?.()) : null);
        if (!channel) return res.json({ success: false, output: 'No valid broadcast channel found.' });

        try {
          await channel.send({
            embeds: [infoEmbed('⚡ TOPT ENGINE Broadcast', messageText).setFooter({ text: 'Official Announcement from Web Console' })]
          });
          logEvent('BROADCAST', `Broadcast sent to #${channel.name}`);
          return res.json({ success: true, output: `[SUCCESS] Broadcast dispatched to #${channel.name}!` });
        } catch (err) {
          return res.json({ success: false, output: `[ERROR] Failed to send: ${err.message}` });
        }

      default:
        return res.json({
          success: false,
          output: `Unknown command: '${cmd}'. Type 'help' for available commands.`
        });
    }
  });

  // Toggle AutoMod / Anti-Nuke from Web Switchboard
  app.post('/api/automod/toggle', (req, res) => {
    const { feature, enabled } = req.body;
    const guild = getFirstGuild(client);
    if (!guild) return res.status(400).json({ success: false, message: 'No active server.' });

    if (feature === 'antiNuke') {
      const conf = antinukeDb.getAntiNukeConfig(guild.id);
      conf.enabled = !!enabled;
      db.save('antinuke');
      logEvent('SECURITY', `Anti-Nuke toggled: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      return res.json({ success: true, feature, enabled });
    }

    automodDb.updateAutoModConfig(guild.id, feature, !!enabled);
    logEvent('SECURITY', `AutoMod ${feature} toggled: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    res.json({ success: true, feature, enabled });
  });

  // Manage Blacklist Words
  app.post('/api/automod/word', (req, res) => {
    const { action, word } = req.body;
    const guild = getFirstGuild(client);
    if (!guild || !word) return res.status(400).json({ success: false, message: 'Invalid request.' });

    if (action === 'add') {
      automodDb.addBannedWord(guild.id, word);
      logEvent('SECURITY', `Added blacklist word: "${word}"`);
      return res.json({ success: true, message: `Added "${word}" to blacklist.` });
    } else if (action === 'remove') {
      automodDb.removeBannedWord(guild.id, word);
      logEvent('SECURITY', `Removed blacklist word: "${word}"`);
      return res.json({ success: true, message: `Removed "${word}" from blacklist.` });
    }

    res.status(400).json({ success: false, message: 'Invalid action.' });
  });

  // Send ModMail Reply from Web Console
  app.post('/api/modmail/reply', async (req, res) => {
    const { ticketId, replyText } = req.body;
    const ticket = db.tickets[ticketId];
    if (!ticket || ticket.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Active ticket not found.' });
    }

    try {
      const user = await client.users.fetch(ticket.userId);
      if (!user) return res.status(404).json({ success: false, message: 'Member not found.' });

      await user.send({
        embeds: [
          infoEmbed('Staff Response • Web Console', replyText)
            .setFooter({ text: 'From: ⚡ TOPT ENGINE Support Dispatcher' })
        ]
      });

      // Also forward into ticket thread if exists
      const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
      if (channel) {
        const thread = await channel.threads.fetch(ticket.threadId).catch(() => null);
        if (thread) {
          await thread.send({
            embeds: [successEmbed('Staff Response (Web Console)', replyText)]
          });
        }
      }

      logEvent('MODMAIL', `Console replied to ticket ${ticketId} (${user.tag})`);
      res.json({ success: true, message: 'Reply delivered to user DM.' });
    } catch (err) {
      res.status(500).json({ success: false, message: `Failed to deliver DM: ${err.message}` });
    }
  });

  // Trigger immediate keep-alive pulse from dashboard
  app.post('/api/keepalive/ping', async (req, res) => {
    const result = await sendPing();
    res.json({
      success: !!(result && result.success),
      result,
      status: getKeepAliveStatus()
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`🌐 [TOPT ENGINE] Cyber Command Center running on http://localhost:${PORT}`);
    // Initialize 24/7 keep-alive sentinel loop
    startKeepAlive(logEvent);
  });

  return server;
}

module.exports = { startWebServer, logEvent };
