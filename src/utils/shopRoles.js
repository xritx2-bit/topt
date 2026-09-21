const config = require('../config');
const economyDb = require('../database/economyDb');

/**
 * Ensures a specific shop role exists in the guild.
 * If not found by name, creates it automatically with the configured color and settings.
 * @param {import('discord.js').Guild} guild
 * @param {object} item
 * @returns {Promise<import('discord.js').Role|null>}
 */
async function ensureShopRole(guild, item) {
  if (!guild || !item || !item.roleName) return null;

  try {
    // 1. Check if role already exists in guild cache or fetched roles
    let role = guild.roles.cache.find(
      r => r.name.toLowerCase() === item.roleName.toLowerCase()
    );

    if (role) return role;

    // Check if bot has permission to manage roles
    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has('ManageRoles')) {
      console.warn(`[SHOP ROLES] Cannot create role "${item.roleName}" in "${guild.name}": Bot missing 'ManageRoles' permission.`);
      return null;
    }

    // 2. Create the role with custom styling
    role = await guild.roles.create({
      name: item.roleName,
      color: item.roleColor || 0x5865F2,
      hoist: Boolean(item.hoist), // Hoisted so VIP Traders appear separated on member list
      mentionable: true,
      reason: `TOPT Shop: Automatic role creation for "${item.name}"`
    });

    console.log(`✅ [SHOP ROLES] Auto-created role "${role.name}" in guild "${guild.name}" (${guild.id})`);
    return role;
  } catch (err) {
    console.error(`❌ [SHOP ROLES] Failed to ensure role "${item.roleName}" in "${guild.name}":`, err.message);
    return null;
  }
}

/**
 * Assigns the shop role to a member upon purchasing an item.
 * Automatically creates the role if it doesn't exist yet!
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember|string} memberOrId
 * @param {object} item
 * @returns {Promise<{ assigned: boolean, role?: import('discord.js').Role, alreadyHad?: boolean, reason?: string }>}
 */
async function assignShopRole(guild, memberOrId, item) {
  if (!guild || !memberOrId || !item || !item.roleName) {
    return { assigned: false, reason: 'Invalid parameters or item has no role mapped' };
  }

  try {
    const member = typeof memberOrId === 'string'
      ? await guild.members.fetch(memberOrId).catch(() => null)
      : memberOrId;

    if (!member) {
      return { assigned: false, reason: 'Could not fetch guild member' };
    }

    const role = await ensureShopRole(guild, item);
    if (!role) {
      return { assigned: false, reason: 'Could not create or find role in server' };
    }

    // Check if member already has this role
    if (member.roles.cache.has(role.id)) {
      return { assigned: true, role, alreadyHad: true };
    }

    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has('ManageRoles')) {
      return { assigned: false, role, reason: 'Bot missing Manage Roles permission' };
    }

    // Check role hierarchy
    if (botMember.roles.highest.position <= role.position) {
      return { assigned: false, role, reason: 'Bot highest role position is lower than shop role' };
    }

    await member.roles.add(role, `TOPT Shop Purchase: ${item.name}`);
    console.log(`🎉 [SHOP ROLES] Granted "${role.name}" to @${member.user?.tag || member.id} in "${guild.name}"`);
    return { assigned: true, role, alreadyHad: false };
  } catch (err) {
    console.error(`❌ [SHOP ROLES] Failed to assign role to member:`, err.message);
    return { assigned: false, reason: err.message };
  }
}

/**
 * Ensures all shop roles exist in all connected guilds, and assigns them
 * retroactively to users who have already purchased the items in database!
 * @param {import('discord.js').Client} client
 */
async function syncAllGuildShopRoles(client) {
  if (!client || !client.guilds) return;

  const guilds = Array.from(client.guilds.cache.values());
  for (const guild of guilds) {
    try {
      console.log(`🔄 [SHOP ROLES] Verifying shop roles in server: "${guild.name}"...`);

      // Ensure all shop roles exist
      const createdRoles = {};
      for (const item of config.shopItems) {
        if (item.roleName) {
          const role = await ensureShopRole(guild, item);
          if (role) createdRoles[item.id] = role;
        }
      }

      // Check users who already own shop items in inventory
      const inventories = economyDb.inventories || {};
      for (const [userId, userInv] of Object.entries(inventories)) {
        if (!Array.isArray(userInv)) continue;

        for (const invEntry of userInv) {
          const item = config.shopItems.find(i => i.id === invEntry.itemId);
          if (item && item.roleName && createdRoles[item.id]) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member && !member.roles.cache.has(createdRoles[item.id].id)) {
              await member.roles.add(createdRoles[item.id], `TOPT Shop Inventory Sync: ${item.name}`).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.error(`[SHOP ROLES] Sync error in "${guild.name}":`, err.message);
    }
  }
}

module.exports = {
  ensureShopRole,
  assignShopRole,
  syncAllGuildShopRoles
};
