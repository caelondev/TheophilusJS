const {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const getAllFiles = require("../../utils/getAllFiles");
const path = require("path");

const CMD_PER_PAGE = 10;

const getFormattedData = (dataObj) => {
  if (dataObj.length === 0) return "No commands found.";

  const result = [];

  for (const data of dataObj) {
    const note = data.serverSpecific ? "(Can only be used in servers.)" : "";

    result.push(`• \`/${data.name}\` — ${data.description} ${note}\n`);
  }

  return result;
};

const getArrayOfCommands = (cmdPath) => {
  const cmds = [];

  const commandFolders = getAllFiles(cmdPath, true);

  for (const folder of commandFolders) {
    const files = getAllFiles(folder);

    files.forEach((f) => {
      const file = require(f);
      if (file.testOnly) return;

      cmds.push({
        name: file.name,
        description: file.description,
        serverSpecific: file.serverSpecific || false,
      });
    });
  }

  cmds.sort((a, b) => {
    const normalizedName1 = a.name.toLowerCase().trim();
    const normalizedName2 = b.name.toLowerCase().trim();

    return normalizedName1.localeCompare(normalizedName2);
  });

  return cmds;
};

const createPages = (commands) => {
  const pages = [];

  for (let i = 0; i < commands.length; i += CMD_PER_PAGE) {
    const pageCommands = commands.slice(i, i + CMD_PER_PAGE);
    pages.push(pageCommands);
  }

  return pages;
};

const createEmbed = (page, currentPage, totalPages, searchQuery = null) => {
  const formattedCommands = getFormattedData(page);

  const title = searchQuery
    ? `📚 Search Results for "${searchQuery}"`
    : "📚 Help Menu";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(formattedCommands.join(""))
    .setColor(0x5865f2)
    .setFooter({
      text: `Page ${currentPage + 1}/${totalPages} • ${page.length} commands on this page`,
    });

  return embed;
};

const createButtons = (currentPage, totalPages) => {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_first")
      .setLabel("⏪")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("help_previous")
      .setLabel("◀️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("help_next")
      .setLabel("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId("help_last")
      .setLabel("⏩")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1),
  );

  return row;
};

const searchCommands = (commands, query) => {
  const normalizedQuery = query.toLowerCase().trim();

  return commands.filter((cmd) => {
    const nameMatch = cmd.name.toLowerCase().includes(normalizedQuery);
    return nameMatch;
  });
};

const handleHelp = async (client, interaction) => {
  const commandQuery = interaction.options.getString("command");

  try {
    await interaction.deferReply();

    const commandsArray = getArrayOfCommands(path.join(__dirname, ".."));

    if (commandsArray.length === 0) {
      return await interaction.editReply("No commands found.");
    }

    let filteredCommands = commandsArray;
    let searchQuery = null;

    if (commandQuery) {
      filteredCommands = searchCommands(commandsArray, commandQuery);
      searchQuery = commandQuery;

      if (filteredCommands.length === 0) {
        return await interaction.editReply(
          `No commands found matching "${commandQuery}".`,
        );
      }
    }

    const pages = createPages(filteredCommands);
    let currentPage = 0;

    const embed = createEmbed(
      pages[currentPage],
      currentPage,
      pages.length,
      searchQuery,
    );
    const buttons = createButtons(currentPage, pages.length);

    const response = await interaction.editReply({
      embeds: [embed],
      components: pages.length > 1 ? [buttons] : [],
    });

    if (pages.length <= 1) return;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (buttonInteraction) =>
        buttonInteraction.user.id === interaction.user.id,
    });

    collector.on("collect", async (buttonInteraction) => {
      switch (buttonInteraction.customId) {
        case "help_first":
          currentPage = 0;
          break;
        case "help_previous":
          currentPage = Math.max(0, currentPage - 1);
          break;
        case "help_next":
          currentPage = Math.min(pages.length - 1, currentPage + 1);
          break;
        case "help_last":
          currentPage = pages.length - 1;
          break;
      }

      const newEmbed = createEmbed(
        pages[currentPage],
        currentPage,
        pages.length,
        searchQuery,
      );
      const newButtons = createButtons(currentPage, pages.length);

      await buttonInteraction.update({
        embeds: [newEmbed],
        components: [newButtons],
      });
    });
  } catch (error) {
    console.log(error);

    try {
      await interaction.editReply(
        "An error occurred while processing the help command.",
      );
    } catch (editError) {
      console.log("Could not send error message:", editError);
    }
  }
};

module.exports = {
  name: "help",
  description: "Shows a help menu with pagination and search.",
  options: [
    {
      name: "command",
      description: "Search for specific commands",
      type: ApplicationCommandOptionType.String,
    },
  ],
  cooldown: 5000,
  callback: handleHelp,
};
