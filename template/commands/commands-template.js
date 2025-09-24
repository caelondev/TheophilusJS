const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  Client,
  Interaction,
  MessageFlags,
} = require("discord.js");

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const commandName = (client, interaction)=>{}

module.exports = {
  name: commandName,
  description: desc,
  options: [],
  serverSpecific: onlyWorkOnServers,
  channelIndependent: canWorkEvenIfNotBotChannel,
  callback: commandName,
};

