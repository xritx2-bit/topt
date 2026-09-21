require('dotenv').config();

module.exports = {
  // Bot Settings
  botName: 'TOPT ENGINE',
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  prefix: process.env.PREFIX || 'topt',
  altPrefix: process.env.ALT_PREFIX || 't',
  port: process.env.PORT || 3000,
  keepAliveUrl: process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || '',

  // Anti-Nuke & Honeypot Defaults
  antinuke: {
    enabled: true,
    channelDeleteLimit: 2, // max 2 channels in 10s
    channelCreateLimit: 3, // max 3 channels in 10s
    roleDeleteLimit: 2,    // max 2 roles in 10s
    memberBanLimit: 3,     // max 3 bans in 10s
    memberKickLimit: 3,    // max 3 kicks in 10s
    actionWindow: 10,      // in seconds
    blockUnauthorizedBots: true
  },

  // AutoMod Defaults
  automod: {
    antiInvite: true,
    antiLink: false,
    antiSpam: true,
    spamThreshold: 5,     // 5 messages in 4 seconds
    maxMentions: 5,       // max 5 user mentions per message
    bannedWords: [
      'discord.gg/',
      'discord.com/invite/',
      'free nitro',
      'steam gift',
      'airdrop',
      't.me/'
    ]
  },

  // Visual Themes & Colors
  colors: {
    primary: 0x5865F2,   // Blurple
    gold: 0xF1C40F,      // Economy & TOPT Currency
    success: 0x2ECC71,   // Green / Success / Profit
    danger: 0xE74C3C,    // Red / Loss / Punish
    info: 0x3498DB,      // Blue / Info / Trading
    purple: 0x9B59B6,    // Epic / Mystery
    dark: 0x2B2D31       // Discord Dark Card
  },

  // Currency Branding
  currency: {
    name: 'TOPT',
    symbol: '🪙',
    formatted: '🪙 TOPT',
    startingBalance: 500
  },

  // Economy Rewards & Cooldowns (in seconds)
  economy: {
    daily: {
      baseAmount: 1000,
      streakBonus: 100, // per consecutive day (max 30 days)
      maxStreak: 30,
      cooldown: 86400 // 24 hours
    },
    work: {
      min: 200,
      max: 600,
      cooldown: 300 // 5 minutes
    },
    beg: {
      min: 50,
      max: 250,
      cooldown: 120 // 2 minutes
    },
    hunt: {
      cooldown: 60 // 1 minute
    },
    gambleCooldown: 5 // 5 seconds between bets
  },

  // OwO-style Collectibles / Assets with Rarities
  collectibles: [
    // Common (50% chance)
    { id: 'penny_stock', name: 'Penny Stock', emoji: '📦', rarity: 'Common', chance: 0.50, sellPrice: 50 },
    { id: 'copper_coin', name: 'Copper Coin', emoji: '🟤', rarity: 'Common', chance: 0.50, sellPrice: 50 },
    { id: 'wood_share', name: 'Timber Share', emoji: '🪵', rarity: 'Common', chance: 0.50, sellPrice: 60 },
    { id: 'sardine', name: 'Silver Sardine', emoji: '🐟', rarity: 'Common', chance: 0.50, sellPrice: 40 },

    // Uncommon (25% chance)
    { id: 'blue_chip', name: 'Blue Chip Share', emoji: '📊', rarity: 'Uncommon', chance: 0.25, sellPrice: 150 },
    { id: 'silver_bar', name: 'Silver Bar', emoji: '🥈', rarity: 'Uncommon', chance: 0.25, sellPrice: 180 },
    { id: 'red_fox', name: 'Red Fox', emoji: '🦊', rarity: 'Uncommon', chance: 0.25, sellPrice: 160 },
    { id: 'quartz_crystal', name: 'Quartz Crystal', emoji: '🔮', rarity: 'Uncommon', chance: 0.25, sellPrice: 170 },

    // Rare (15% chance)
    { id: 'tech_stock', name: 'Tech Giant Share', emoji: '📈', rarity: 'Rare', chance: 0.15, sellPrice: 500 },
    { id: 'gold_ingot', name: 'Gold Ingot', emoji: '🥇', rarity: 'Rare', chance: 0.15, sellPrice: 600 },
    { id: 'dire_wolf', name: 'Shadow Wolf', emoji: '🐺', rarity: 'Rare', chance: 0.15, sellPrice: 550 },
    { id: 'emerald', name: 'Flawless Emerald', emoji: '💎', rarity: 'Rare', chance: 0.15, sellPrice: 650 },

    // Epic (7% chance)
    { id: 'rocket_stock', name: 'Space Exploration Stock', emoji: '🚀', rarity: 'Epic', chance: 0.07, sellPrice: 1800 },
    { id: 'oil_barrel', name: 'Crude Oil Barrel', emoji: '🛢️', rarity: 'Epic', chance: 0.07, sellPrice: 1600 },
    { id: 'tiger', name: 'Golden Saber Tiger', emoji: '🐯', rarity: 'Epic', chance: 0.07, sellPrice: 2000 },
    { id: 'sapphire', name: 'Star Sapphire', emoji: '🔷', rarity: 'Epic', chance: 0.07, sellPrice: 1900 },

    // Legendary (2.5% chance)
    { id: 'satoshi_btc', name: "Satoshi's Genesis Block", emoji: '👑', rarity: 'Legendary', chance: 0.025, sellPrice: 6000 },
    { id: 'real_estate', name: 'Manhattan Sky Penthouse', emoji: '🏰', rarity: 'Legendary', chance: 0.025, sellPrice: 5500 },
    { id: 'golden_dragon', name: 'Celestial Dragon', emoji: '🐉', rarity: 'Legendary', chance: 0.025, sellPrice: 7000 },

    // Mythic (0.5% chance)
    { id: 'quantum_core', name: 'Quantum Singularity Engine', emoji: '🌌', rarity: 'Mythic', chance: 0.005, sellPrice: 25000 },
    { id: 'midas_crown', name: 'Crown of King Midas', emoji: '🌟', rarity: 'Mythic', chance: 0.005, sellPrice: 30000 },
    { id: 'private_planet', name: 'Orbital Terraformed Planet', emoji: '🪐', rarity: 'Mythic', chance: 0.005, sellPrice: 35000 }
  ],

  // Shop Items with utility perks
  shopItems: [
    {
      id: 'lucky_coin',
      name: 'Lucky Coin',
      emoji: '🍀',
      price: 3000,
      description: '+5% higher win probability on Coinflip and Dice games'
    },
    {
      id: 'trader_license',
      name: "Broker's License",
      emoji: '📜',
      price: 6000,
      description: '+30% bonus TOPT coins earned from /work shifts'
    },
    {
      id: 'hunter_scope',
      name: "Surveyor's Lens",
      emoji: '🔭',
      price: 12000,
      description: 'Increases chance of finding Epic, Legendary & Mythic assets in /hunt'
    },
    {
      id: 'vip_badge',
      name: 'VIP Trader Badge',
      emoji: '💎',
      price: 30000,
      description: 'Prestigious VIP badge shown on your profile + 20% daily bonus'
    }
  ]
};
