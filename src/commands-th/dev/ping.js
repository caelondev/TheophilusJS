const handlePing = async (client, message) => {
  try {
    const start = Date.now();
    const sent = await message.reply("🏓 Pinging...");
    const latency = Date.now() - start;

    await sent.edit(
      `🏓 Pong! Client: ${latency}ms | WebSocket: ${client.ws.ping}ms`,
    );
  } catch (error) {
    console.error("Ping command error:", error);
  }
};

module.exports = {
  name: "ping",
  description: "Ping the developer panel",
  options: [],
  callback: handlePing,
};
