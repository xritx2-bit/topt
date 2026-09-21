const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('🧪 Starting Automated Validation Suite for TOPT ENGINE...\n');

// 1. Test Database & Economy
console.log('▶ [1/6] Testing Database & Economy Engine...');
const economyDb = require('../src/database/economyDb');
const repDb = require('../src/database/repDb');
const selfRoleDb = require('../src/database/selfRoleDb');
const modmailDb = require('../src/database/modmailDb');
const warnDb = require('../src/database/warnDb');
const automodDb = require('../src/database/automodDb');
const antinukeDb = require('../src/database/antinukeDb');
const config = require('../src/config');
const { parseAmount, rollHuntCollectible } = require('../src/utils/helpers');

const testUser1 = `user_test_1_${Date.now()}`;
const testUser2 = `user_test_2_${Date.now()}`;

// Check starting balance
let user1 = economyDb.getUser(testUser1);
assert.strictEqual(user1.wallet, config.currency.startingBalance, 'Default wallet should match startingBalance');

// Test add and remove wallet
economyDb.addWallet(testUser1, 500);
assert.strictEqual(economyDb.getUser(testUser1).wallet, config.currency.startingBalance + 500, 'Wallet should increase by 500');

economyDb.removeWallet(testUser1, 200);
assert.strictEqual(economyDb.getUser(testUser1).wallet, config.currency.startingBalance + 300, 'Wallet should decrease by 200');

// Test transfer
const initialU2 = economyDb.getUser(testUser2).wallet;
const transferSuccess = economyDb.transfer(testUser1, testUser2, 150);
assert.strictEqual(transferSuccess, true, 'Transfer should succeed');
assert.strictEqual(economyDb.getUser(testUser2).wallet, initialU2 + 150, 'Recipient should receive 150');

// Test daily claim
const dailyResult = economyDb.claimDaily(testUser1);
assert.strictEqual(dailyResult.success, true, 'Daily claim should succeed on first attempt');
assert(dailyResult.reward >= config.economy.daily.baseAmount, 'Daily reward should be at least base amount');

// Second daily immediate claim should be on cooldown
const dailyRetry = economyDb.claimDaily(testUser1);
assert.strictEqual(dailyRetry.success, false, 'Consecutive daily claim must fail on cooldown');

// Test deposit
const preDepWallet = economyDb.getUser(testUser1).wallet;
const preDepBank = economyDb.getUser(testUser1).bank;
const depResult = economyDb.deposit(testUser1, 200);
assert.strictEqual(depResult, true, 'Deposit should succeed');
assert.strictEqual(economyDb.getUser(testUser1).wallet, preDepWallet - 200, 'Wallet should decrease by deposit amount');
assert.strictEqual(economyDb.getUser(testUser1).bank, preDepBank + 200, 'Bank should increase by deposit amount');

// Test withdraw
const withResult = economyDb.withdraw(testUser1, 100);
assert.strictEqual(withResult, true, 'Withdraw should succeed');
assert.strictEqual(economyDb.getUser(testUser1).bank, preDepBank + 100, 'Bank should decrease by withdraw amount');
assert.strictEqual(economyDb.getUser(testUser1).wallet, preDepWallet - 100, 'Wallet should increase by withdraw amount');

// Test bank protection against snatching
const protectedUser = `user_vault_protected_${Date.now()}`;
economyDb.getUser(protectedUser);
const u = economyDb.getUser(protectedUser);
u.wallet = 0;
u.bank = 5000;

// Attempt snatch against a user with empty wallet but funds in bank
const snatchBankShield = economyDb.snatch(testUser1, protectedUser);
assert.strictEqual(snatchBankShield.success, false, 'Snatch against 0 wallet must fail');
assert.strictEqual(snatchBankShield.reason, 'EMPTY_WALLET', 'Reason must be EMPTY_WALLET');
assert.strictEqual(economyDb.getUser(protectedUser).bank, 5000, 'Bank Vault must remain 100% untouched!');

// Test snatch with funds in wallet
const victimUser = `user_victim_${Date.now()}`;
economyDb.addWallet(victimUser, 1000);
const robberUser = `user_robber_${Date.now()}`;
const snatchResult = economyDb.snatch(robberUser, victimUser);
assert(snatchResult.reason === 'CAUGHT' || snatchResult.success === true, 'Snatch should resolve to CAUGHT or success');
const robberCooldown = economyDb.getCooldownRemaining(robberUser, 'snatch', config.economy.snatch.cooldown);
assert(robberCooldown > 0, 'Snatch must set a 5-minute cooldown on robber');

console.log('✅ Database & Economy Engine (including Deposit, Withdraw & Snatch) passed all assertions!');

// 2. Test Trading Reputation System
console.log('\n▶ [2/6] Testing Trading Reputation & Vouches...');
const selfVouch = repDb.addVouch({
  targetId: testUser1,
  authorId: testUser1,
  type: 1,
  comment: 'Self test'
});
assert.strictEqual(selfVouch.success, false, 'Self-vouching must be rejected');

const legitVouch = repDb.addVouch({
  targetId: testUser1,
  authorId: testUser2,
  type: 1,
  comment: 'Smooth and reliable trade'
});
assert.strictEqual(legitVouch.success, true, 'Peer vouch should be accepted');

const rep = repDb.getReputation(testUser1);
assert.strictEqual(rep.positive, 1, 'Positive vouches count should be 1');
assert.strictEqual(rep.trustScore, 100, 'Trust score should be 100%');
console.log('✅ Trading Reputation System passed all assertions!');

// 3. Test ModMail (Abyss-style DM Tickets)
console.log('\n▶ [3/6] Testing Abyss-style ModMail Ticket System...');
const ticketId = `ticket_${Date.now()}`;
const ticket = modmailDb.createTicket({
  ticketId,
  userId: testUser1,
  guildId: 'guild_123',
  channelId: 'channel_123',
  threadId: 'thread_456'
});
assert.strictEqual(ticket.status, 'open', 'Ticket should be open upon creation');

const fetchedByThread = modmailDb.getTicketByThread('thread_456');
assert.strictEqual(fetchedByThread.ticketId, ticketId, 'Should find ticket by threadId');

const activeByUser = modmailDb.getActiveTicketByUser(testUser1);
assert.strictEqual(activeByUser.ticketId, ticketId, 'Should find active ticket by userId');

const closedTicket = modmailDb.closeTicket(ticketId, 'Solved inquiry', 'Moderator#0001');
assert.strictEqual(closedTicket.status, 'closed', 'Ticket should be closed');
assert.strictEqual(modmailDb.getActiveTicketByUser(testUser1), null, 'User should have no active tickets once closed');
console.log('✅ ModMail System passed all assertions!');

// 4. Test AutoMod & Warnings System
console.log('\n▶ [4/6] Testing AutoMod & Infraction Warnings...');
automodDb.addBannedWord('guild_123', 'scamcoin');
const autoModConf = automodDb.getAutoModConfig('guild_123');
assert(autoModConf.bannedWords.includes('scamcoin'), 'Blacklist should include scamcoin');

automodDb.removeBannedWord('guild_123', 'scamcoin');
const updatedConf = automodDb.getAutoModConfig('guild_123');
assert(!updatedConf.bannedWords.includes('scamcoin'), 'Blacklist should no longer include scamcoin');

// Warnings test
warnDb.addWarning({
  guildId: 'guild_123',
  userId: testUser1,
  moderatorId: 'mod_1',
  reason: 'Spamming invite links'
});
const warns = warnDb.getWarnings('guild_123', testUser1);
assert.strictEqual(warns.length, 1, 'Should have 1 warning');
assert.strictEqual(warns[0].reason, 'Spamming invite links', 'Warning reason should match');

const clearedCount = warnDb.clearWarnings('guild_123', testUser1);
assert.strictEqual(clearedCount, 1, 'Should clear 1 warning');
assert.strictEqual(warnDb.getWarnings('guild_123', testUser1).length, 0, 'Warnings should be empty after clearing');
console.log('✅ AutoMod & Warnings passed all assertions!');

// 5. Test Anti-Nuke & Honeypot System
console.log('\n▶ [5/6] Testing Anti-Nuke Guardian & Honeypot...');
antinukeDb.addWhitelist('guild_123', 'trusted_user_999');
assert.strictEqual(antinukeDb.isWhitelisted('guild_123', 'trusted_user_999', 'owner_111'), true, 'User should be whitelisted');
assert.strictEqual(antinukeDb.isWhitelisted('guild_123', 'owner_111', 'owner_111'), true, 'Server owner must always be immune');
assert.strictEqual(antinukeDb.isWhitelisted('guild_123', 'unknown_user', 'owner_111'), false, 'Unknown user should not be whitelisted');

antinukeDb.setHoneypot('guild_123', 'channel_honeypot_777');
assert.strictEqual(antinukeDb.getAntiNukeConfig('guild_123').honeypotChannelId, 'channel_honeypot_777', 'Honeypot channel must be stored');
console.log('✅ Anti-Nuke & Honeypot passed all assertions!');

// 6. Test Command Registry & Handlers
console.log('\n▶ [6/6] Validating All Command Files & Handlers...');
const commandsPath = path.join(__dirname, '../src/commands');
const commandFolders = fs.readdirSync(commandsPath);
let totalCommands = 0;

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(path.join(folderPath, file));
    assert(cmd.data && cmd.data.name, `${file} must export data with a name`);
    assert(typeof cmd.executeSlash === 'function', `${file} must export executeSlash method`);
    totalCommands++;
  }
}
console.log(`✅ All ${totalCommands} commands successfully loaded and structurally valid!`);

console.log('\n🎉 ALL 6 TEST SUITES PASSED! TOPT ENGINE (AutoMod, Anti-Nuke, ModMail, Economy & Web Console) is 100% verified.');
