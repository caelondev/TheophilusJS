/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const { client, interaction } = require("discord.js");

/**
 * @param {client} client
 * @param {interaction} interaction
 */

const handlePing = async (client, interaction) => {
  await interaction.deferReply();
  const reply = await interaction.fetchReply();
  const ping = reply.createdTimestamp - interaction.createdTimestamp;

  interaction.editReply(
    `Pong! Client: **${ping}ms** | Websocket: **${client.ws.ping}ms**`,
  );
};

module.exports = {
  name: "ping",
  description: "Pong!",
  cooldown: 5000,
  callback: handlePing,
};
