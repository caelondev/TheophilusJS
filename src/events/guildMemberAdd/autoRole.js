/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { Client, GuildMember } = require("discord.js");
const AutoRole = require("../../models/AutoRole");

/**
 * @param {Client} client
 * @param {GuildMember} member
 */
module.exports = async (client, member) => {
  try {
    const guild = member.guild;
    if (!guild) return;

    const autoRole = await AutoRole.findOne({ guildId: guild.id });
    if (!autoRole) return;

    const role = guild.roles.cache.get(autoRole.roleId);
    const botMember = guild.members.cache.get(client.user.id);

    const conditions = [
      !role,
      !botMember,
      role.position >= botMember.roles.highest.position,
      role.managed,
      member.roles.cache.has(autoRole.roleId),
    ];

    if (conditions.some(Boolean)) return;

    await member.roles.add(role);

  } catch (error) {
    console.log(`There was an error whilst giving role: ${error}`);
  }
};
