/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const eventHandler = require("./handlers/eventHandler");
const buildConfig = require("./utils/buildConfig");
const drawLine = require("./utils/drawLine");
const path = require("path");
const connectMongoDB = require("./utils/connectMongoDB");
const handlers = path.join(__dirname, "handlers");
const getAllFiles = require("./utils/getAllFiles");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildPresences,
    IntentsBitField.Flags.MessageContent,
  ],
});

loginBot = async (TOKEN) => {
  try {
    console.log(`🔑 Bot is logging in...`);
    await client.login(TOKEN);
  } catch (error) {
    console.log(error);
  }
};

const loadHandlers = async (client) => {
  const handlerFiles = getAllFiles(handlers);
  for (const handler of handlerFiles) {
    try {
      const handlerObject = require(handler);
      const handlerName = handler.replace(/\\/g, "/").split("/").pop();
      await handlerObject.main(client);
      console.log(`💾 Loaded ${handlerName} handler.`);
    } catch (e) {
      console.error("Failed to load handler:", handler, e);
    }
  }
};

const initialize = async () => {
  console.clear();
  drawLine();
  buildConfig();
  await connectMongoDB(process.env.MONGODB_URI);
  await loadHandlers(client);
  await loginBot(process.env.DISCORD_TOKEN);
};

module.exports = initialize;
