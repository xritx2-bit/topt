# ⚡ TOPT ENGINE — Ultimate Discord Trading, Security, AutoMod & Economy Bot

A high-performance Discord bot named **TOPT ENGINE** built for **Trading Communities & Server Security**. Includes powerful **Server Management & Moderation**, an **Abyss-style DM ModMail Ticket System**, **Carl-bot Style AutoMod & Audit Logging**, **Anti-Nuke & Honeypot Guardian**, an **Interactive Self-Roles** button generator, a built-in **Web Console / Status Dashboard**, and a full **OwO-Style Economy featuring "TOPT Currency"** (`🪙 TOPT`).

---

## 🌟 Key Systems

### 1. 📬 DM Support / ModMail System (Like Abyss Bot)
- **Direct Message Routing**: When a member sends a DM to the bot, it automatically creates a dedicated ticket thread inside your staff's `#modmail-tickets` channel.
- **Two-Way Staff Communication**:
  - Staff can reply in the thread with `/reply <message>` (or `/reply <message> anonymous:True`).
  - The bot immediately delivers the staff response directly into the user's DMs as an official embed.
- **Ticket Lifecycle**:
  - `/close [reason]`: Closes the ticket, archives the thread, and DMs the user a completion receipt.
  - `/modmail-setup <channel>`: Sets up the staff ticket channel.

### 2. 🪤 Honeypot & Anti-Nuke Defense Guardian
- **Honeypot Trap Channel (`/honeypot setup`)**:
  - Automatically creates a decoy channel (e.g. `#rules-verification`) with strict warnings not to post.
  - Any unauthorized user or scraping raid bot that posts in the honeypot is **instantly auto-banned on the spot**.
- **Anti-Nuke Rate Limiter (`/antinuke`)**:
  - Real-time audit log monitor that intercepts rogue admins or compromised tokens:
    - **Channel Delete Protection**: Max 2 channels in 10 seconds.
    - **Role Delete Protection**: Max 2 roles in 10 seconds.
    - **Mass Ban & Kick Protection**: Max 3 bans in 10 seconds.
    - **Unauthorized Bot Protection**: Non-whitelisted members cannot invite rogue bots.
  - **Emergency Punishment**: Strips all administrative roles from the attacker, permanently bans the account, sends an alert to `#mod-logs`, and sends a critical DM to the Server Owner.
- **Whitelist**: `/antinuke whitelist add @user` exempts trusted co-owners.

### 3. 🛡️ Carl-bot Style AutoMod & Audit Logging
- **Automated Filters (`/automod status`, `/automod toggle`)**:
  - **Anti-Invite**: Detects and deletes Discord invite links (`discord.gg/`, `discord.com/invite/`).
  - **Anti-Link**: Blocks unauthorized external URLs.
  - **Anti-Spam**: Flags and times out rapid message floods (> 5 messages in 4 seconds).
  - **Mass Mention Limiter**: Blocks messages tagging > 5 members.
  - **Blacklist Filter**: Blocks custom forbidden words and scam phrases (`/automod addword <phrase>`).
- **Infraction Warning System**:
  - `/warn @user <reason>`: Issues a formal warning saved in the database.
  - `/warnings [user]`: Inspect user infraction history.
  - `/clearwarns @user`: Clears infractions.
- **Audit Logging (`/setlogs <channel>`)**:
  - Logs deleted messages, edited messages, member joins, and member leaves.
- **Greetings & Auto-Roles (`/welcome-setup <channel> [role]`)**:
  - Welcome messages and automatic role assignment on join.

### 4. 🪙 OwO-Style "TOPT Currency" Economy
- **Dual Command Interface**: Play using modern Discord **Slash Commands (`/`)** OR rapid-fire **Text Commands** (`topt <command>` or `t <command>`) just like in OwO bot!
- **Daily Rewards (`topt daily` / `/daily`)**: Daily dividends with consecutive day streak multipliers (up to 30 days) and VIP bonuses.
- **Work Shifts (`topt work` / `/work`)**: Roleplay market-making, arbitrage trading, and liquidity providing for salary.
- **Begging (`topt beg` / `/beg`)**: Ask crypto whales and Wall Street traders for spare coins.
- **OwO-Style Hunt (`topt hunt` / `/hunt`)**: Search the markets for 23+ collectible commodities and rare assets across 6 rarities (*Common, Uncommon, Rare, Epic, Legendary, Mythic*).
- **Gambling Games**:
  - `topt cf <amount> [h/t]` / `/coinflip`: 50/50 double-or-nothing coinflip.
  - `topt slots <amount>` / `/slots`: 3-reel slot machine with 10x Mega Jackpots.
  - `topt dice <amount>` / `/dice`: Roll 2 dice against the House.
- **Shop & Upgrades (`topt shop`, `topt buy <id>`)**:
  - 🍀 `lucky_coin`: +5% win chance on Coinflip and Dice games.
  - 📜 `trader_license`: +30% bonus salary on `/work` shifts.
  - 🔭 `hunter_scope`: Increases discovery rate of Epic, Legendary & Mythic assets in `/hunt`.
  - 💎 `vip_badge`: Prestigious VIP profile badge + 20% daily dividend bonus.
- **Inventory & Liquidation (`topt inv`, `topt sell <id|all>`)**: View total asset portfolio valuation or liquidate collectibles into TOPT currency.
- **Leaderboards (`topt top` / `/leaderboard`)**: Track the server's richest traders ranked by total net worth.

### 5. 🤝 Trading Reputation & Vouch System
- `/vouch @trader <+1|-1> <comment> [proof]`: Leave verified positive or negative trading feedback.
- `/rep [@trader]`: Check a member's Trust Score percentage, total vouches, and recent reviews.
- `/scamreport @suspect <details> [evidence]`: Instantly alert moderators of suspected scams or trade disputes.

### 6. 🎭 Interactive Self-Roles
- `/selfroles panel`: Create customized embeds with clickable buttons for members to toggle roles (e.g., *Crypto Trader*, *Stock Trader*, *Buyer*, *Seller*, *Trade Alerts*).

### 7. 🌐 Web Console & Status Dashboard
- Access your bot's live dashboard in any browser at `http://localhost:3000` (or your Render URL).
- Live metrics: Discord ping, RAM usage, TOPT currency in circulation, active ModMail tickets, warnings, and live system log stream.

---

## 🚀 How to Deploy on Render (Free 24/7 Hosting)

Render allows you to host this bot for free as a **Web Service**.

### Step 1: Push Project to GitHub
1. Create a repository on GitHub (e.g. `topt-discord-bot`).
2. Push this project code to your GitHub repo.

### Step 2: Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `topt-trading-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Under **Advanced** -> **Health Check Path**, enter: `/health`.

### Step 3: Add Environment Variables in Render
Add the following Environment Variables in the Render dashboard:
- `DISCORD_TOKEN`: (Your Bot Token from Discord Developer Portal)
- `CLIENT_ID`: (Your Application/Client ID)
- `GUILD_ID`: (Your Discord Server ID)
- `PREFIX`: `topt`
- `ALT_PREFIX`: `t`
- `PORT`: `10000`

### Step 4: Deploy
Click **Create Web Service**. Render will install dependencies, bind to port 10000, verify the `/health` endpoint, start your bot, and launch the Web Console at `https://your-service-name.onrender.com`!

> **💡 Keeping Free Tier Awake**: Free Render web services spin down after 15 minutes of HTTP inactivity. To keep your Discord bot online 24/7 for free, create a free monitor on [UptimeRobot.com](https://uptimerobot.com) pointing to `https://your-service-name.onrender.com/health` every 5 minutes!

---

## 📖 Complete Command Handbook

| Category | Command | Description |
| :--- | :--- | :--- |
| **ModMail** | `/modmail-setup <channel>` | Set staff channel for incoming user DM tickets |
| **ModMail** | `/reply <message> [anon]` | Staff reply to member from inside ticket thread |
| **ModMail** | `/close [reason]` | Close and archive active ticket thread |
| **Security** | `/antinuke status` | View Anti-Nuke defense thresholds and whitelist |
| **Security** | `/antinuke toggle <true\|false>`| Enable or disable Anti-Nuke defense |
| **Security** | `/antinuke whitelist add/remove`| Whitelist trusted co-owners or staff |
| **Security** | `/honeypot setup [channel]` | Setup decoy honeypot trap to auto-ban raid bots |
| **AutoMod** | `/automod status` | View active AutoMod filters |
| **AutoMod** | `/automod toggle <feature>` | Toggle Anti-Invite, Anti-Link, Anti-Spam |
| **AutoMod** | `/automod addword/removeword`| Blacklist phrases or scam links |
| **AutoMod** | `/setlogs <channel>` | Set Carl-bot style moderation audit channel |
| **Management** | `/warn @user <reason>` | Issue a formal warning |
| **Management** | `/warnings [user]` | Inspect user infraction history |
| **Management** | `/clearwarns @user` | Clear all warnings |
| **Management** | `/welcome-setup <ch> [role]` | Configure welcome messages and auto-role |
| **Management** | `/kick @user [reason]` | Kick a user |
| **Management** | `/ban @user [reason]` | Ban a user |
| **Management** | `/timeout @user <mins>` | Temporarily mute a user |
| **Management** | `/clear <1-100>` | Bulk delete messages |
| **Management** | `/lock` & `/unlock` | Channel emergency lockdown |
| **Economy** | `topt cash` / `/balance` | Check wallet, bank, and net worth |
| **Economy** | `topt daily` / `/daily` | Claim daily dividend and build streak |
| **Economy** | `topt work` / `/work` | Complete trading shift for salary |
| **Economy** | `topt beg` / `/beg` | Collect spare coins |
| **Economy** | `topt hunt` / `/hunt` | Hunt 23+ rare commodities & collectibles |
| **Economy** | `topt cf <amt> [h/t]` | Double-or-nothing 50/50 coinflip |
| **Economy** | `topt slots <amt>` | 3-reel slot machine (10x jackpots) |
| **Economy** | `topt dice <amt>` | Roll dice against the House |
| **Economy** | `topt shop` & `topt buy` | Buy upgrades (`lucky_coin`, `vip_badge`, etc.) |
| **Economy** | `topt inv` / `/inventory` | View assets & portfolio valuation |
| **Economy** | `topt sell all` | Liquidate commodities for coins |
| **Economy** | `topt pay @user <amt>` | Peer-to-peer money transfers |
| **Economy** | `topt top` / `/leaderboard`| Wealth leaderboard |
| **Trading** | `/vouch @trader <+1\|-1>` | Leave verified trade feedback |
| **Trading** | `/rep [@trader]` | View trust score and reviews |
| **Trading** | `/scamreport @suspect` | Alert staff of trade dispute/scam |
| **Self Roles**| `/selfroles panel` | Deploy clickable button self-role panel |
| **General** | `/help` / `topt help` | Complete command handbook |
