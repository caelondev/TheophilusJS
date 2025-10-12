const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require("discord.js");

const config = require("../../../config.json");
const loadedThCommands = require("../../handlers/loadThCommands");
const BotConfig = require("../../models/BotConfig");
const NSFWUsers = require("../../models/NSFWUsers");

const cooldowns = new Set();

let botConfig;

const notifyNSFW = async (userId, nsfwUsers, message) => {
  const notificationEmbed = new EmbedBuilder()
    .setTitle("Mature content ahead")
    .setDescription("The `nsfw` category is for 18+ only. Do you wish to continue?");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("nsfw-exit")
      .setLabel("Exit")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("nsfw-continue")
      .setLabel("Continue")
      .setStyle(ButtonStyle.Primary)
  );

  const reply = await message.reply({
    embeds: [notificationEmbed],
    components: [row]
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== userId) {
      return interaction.reply({ 
        content: "This prompt isn’t for you.", 
        ephemeral: true 
      });
    }

    if (interaction.customId === "nsfw-exit") {
      await interaction.update({
        content: "You chose to exit. NSFW commands cancelled.",
        embeds: [],
        components: []
      });
      collector.stop("exit");
    }

    else if (interaction.customId === "nsfw-continue") {
      if (!nsfwUsers.listedUsers.includes(userId)) {
        nsfwUsers.listedUsers.push(userId);
        await nsfwUsers.save();
      }

      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setDescription("Successfully added you to the NSFW whitelist. You can now use `nsfw` category and its commands.")
        ],
        components: []
      });

      collector.stop("continue");
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await reply.edit({
        content: "Timed out. You didn’t respond in time.",
        embeds: [],
        components: []
      }).catch(() => {});
    }
  });
};

module.exports = async (client, message) => {
  const prefix = config.botSecondaryPrefix;
  const content = message.content.trim();
  if (!content.startsWith(prefix)) return;

  try {
    if (message.author.bot) return;
    if (cooldowns.has(message.author.id)) return;

    botConfig = await BotConfig.findOne({ guildId: message.guild.id });

    if (botConfig?.channelId !== message.channel.id && !message.channel.nsfw) {
      await message.delete().catch(() => {});
      const botChannel = await client.channels.fetch(botConfig.channelId);

      const reply = await message.channel.send(
        `You can only use \`${prefix}\` commands in ${botChannel} or an NSFW channel.`
      );

      setTimeout(() => reply.delete().catch(() => {}), 5000);
      return;
    }

    const rawInput = content.slice(prefix.length).trim();
    const tokens = rawInput.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
      return message.reply(
        `Syntax error. You need at least 2 tokens in your request. Type \`${prefix}help syntax\` or \`${prefix}help list\`.`
      );
    }

    const command = {
      category: tokens[0],
      name: tokens[1],
      args: tokens.slice(2),
    };

    const loadedCommands = loadedThCommands.loadedCommands;

    if (!(command.category in loadedCommands)) {
      return message.reply(`The category \`${command.category}\` does not exist.`);
    }

    if (command.category === "dev" && !config.devs.includes(message.author.id))
      return;

    // 🧠 NSFW logic
    if (command.category === "nsfw") {
      if (!message.channel.nsfw) return;

      let nsfwUsers = await NSFWUsers.findOne({ guildId: message.guild.id });
      if (!nsfwUsers)
        nsfwUsers = await NSFWUsers.create({ guildId: message.guild.id, listedUsers: [] });

      const userId = message.author.id.toString();

      if (!nsfwUsers.listedUsers.includes(userId)) {
        return notifyNSFW(userId, nsfwUsers, message);
      }
    }

    const loadedCommandCategory = loadedCommands[command.category];
    const foundCommand = loadedCommandCategory
      .map((fp) => require(fp))
      .find((cmd) => cmd?.name?.toLowerCase() === command.name.toLowerCase());

    if (!foundCommand) {
      return message.reply(`The command \`${command.name}\` in \`${command.category}\` category does not exist.`);
    }

    if ("options" in foundCommand) {
      const options = foundCommand.options;
      const requiredArgs = options.filter((o) => o.required);
      const isMultiOpt = foundCommand.multiOpt === true;

      if (!isMultiOpt && command.args.length > options.length) {
        return message.reply(
          `Too many arguments. Required: ${options.length}. Received: ${command.args.length}`
        );
      }

      if (requiredArgs.length > command.args.length) {
        return message.reply(
          `Too few arguments. Required: ${requiredArgs.length}. Received: ${command.args.length}`
        );
      }

      for (let i = 0; i < options.length; i++) {
        options[i].value = command.args[i];
      }

      if (isMultiOpt && command.args.length > options.length) {
        options.push({
          name: "rest",
          value: command.args.slice(options.length),
        });
      }
    }

    await foundCommand.callback(client, message);
  } catch (e) {
    console.error(e);
    message.reply(`An error occurred whilst parsing your command.`);
  }
};
