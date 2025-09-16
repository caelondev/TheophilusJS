module.exports = {
  name: "ping",
  description: "Check bot latency",
  callback: async (client, message) => {
    const sent = await message.reply("🏓 Pinging...");
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    sent.edit(
      `🏓 Pong from Developer panel!!\n- Message latency: **${latency}ms**\n- API latency: **${apiLatency}ms**`
    );
  },
};
