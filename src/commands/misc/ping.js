const { Client, Interaction } = require("discord.js")

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */

const handlePing = async(client, interaction)=>{
  await interaction.deferReply();
  const reply = await interaction.fetchReply();
  const ping = reply.createdTimestamp - interaction.createdTimestamp;

  interaction.editReply(
    `Pong! Client: ${ping}ms | Websocket: ${client.ws.ping}ms`,
  );
}


module.exports = {
  name: "ping",
  description: "Pong!",
  callback: handlePing
};
