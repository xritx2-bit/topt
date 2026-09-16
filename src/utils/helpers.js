const config = require('../config');

// Format number with commas
function formatNumber(num) {
  return (num || 0).toLocaleString('en-US');
}

// Format TOPT currency
function formatCurrency(amount) {
  return `${config.currency.symbol} ${formatNumber(amount)} ${config.currency.name}`;
}

// Format seconds into human readable duration (e.g., 2h 15m 30s)
function formatDuration(seconds) {
  if (seconds <= 0) return 'Ready now';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// Create ASCII/Emoji progress bar
function createProgressBar(current, max, size = 10) {
  const percent = Math.min(1, Math.max(0, current / (max || 1)));
  const progress = Math.round(size * percent);
  const emptyProgress = size - progress;

  const progressText = '🟩'.repeat(progress);
  const emptyProgressText = '⬛'.repeat(emptyProgress);
  const percentageText = `${Math.round(percent * 100)}%`;

  return `${progressText}${emptyProgressText} [${percentageText}]`;
}

// Generate random integer inclusive
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Parse bet or money amount string (e.g. '100', '1k', '5m', 'all', 'half')
function parseAmount(input, maxAmount) {
  if (!input) return null;
  const str = input.toString().toLowerCase().trim();

  if (str === 'all' || str === 'max') {
    return maxAmount;
  }
  if (str === 'half') {
    return Math.floor(maxAmount / 2);
  }

  let multiplier = 1;
  let cleanStr = str;
  if (str.endsWith('k')) {
    multiplier = 1000;
    cleanStr = str.slice(0, -1);
  } else if (str.endsWith('m')) {
    multiplier = 1000000;
    cleanStr = str.slice(0, -1);
  }

  const num = parseInt(cleanStr, 10);
  if (isNaN(num) || num <= 0) return null;

  return num * multiplier;
}

// Select a hunt collectible using weighted probability
function rollHuntCollectible(hasHunterScope = false) {
  // Collectibles list from config
  const list = config.collectibles;

  // If user has hunter scope, boost epic, legendary, mythic weights
  let weightedList = list.map(item => {
    let weight = item.chance;
    if (hasHunterScope) {
      if (item.rarity === 'Mythic') weight *= 2.5;
      else if (item.rarity === 'Legendary') weight *= 2.0;
      else if (item.rarity === 'Epic') weight *= 1.5;
    }
    return { item, weight };
  });

  const totalWeight = weightedList.reduce((acc, curr) => acc + curr.weight, 0);
  let random = Math.random() * totalWeight;

  for (const entry of weightedList) {
    if (random < entry.weight) {
      return entry.item;
    }
    random -= entry.weight;
  }

  return list[0];
}

module.exports = {
  formatNumber,
  formatCurrency,
  formatDuration,
  createProgressBar,
  randomInt,
  parseAmount,
  rollHuntCollectible
};
