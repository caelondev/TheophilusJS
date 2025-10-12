const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
} = require("discord.js");
const getAllFiles = require("../../utils/getAllFiles");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter");
const path = require("path");
const config = require("../../../config.json")

const CMD_PER_PAGE = 10;
const MAX_SELECT_OPTIONS = 25;

const safeRequire = (filePath) => {
  try {
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch (err) {
    return null;
  }
};

const getFormattedData = (dataObj) => {
  if (!Array.isArray(dataObj) || dataObj.length === 0) return ["No commands found."];
  const result = [];
  for (const data of dataObj) {
    const note = data.serverSpecific ? " (Can only be used in servers.)" : "";
    const name = data.name ?? "unknown";
    const desc = data.description ?? "No description provided.";
    result.push(`• \`${name}\` — ${desc}${note}\n`);
  }
  return result;
};

const getCategorizedCommands = (cmdPath, message) => {
  const categories = {};
  const commandFolders = Array.isArray(getAllFiles(cmdPath, true)) ? getAllFiles(cmdPath, true) : [];
  
  for (const folder of commandFolders) {
    try {
      const categoryName = path.basename(folder) || "unknown";
      if(categoryName === "dev" && !config.devs.includes(message.author.id)) continue
      if(categoryName === "nsfw" && !message.channel.nsfw) continue

      const files = Array.isArray(getAllFiles(folder)) ? getAllFiles(folder) : [];
      const categoryCommands = [];

      for (const f of files) {
        try {
          const file = safeRequire(f);
          if (!file) continue;
          const cmd = file.default ?? file;
          if (cmd.testOnly) continue;
          if (!cmd.name || !cmd.description) continue;
          
          categoryCommands.push({
            name: cmd.name,
            description: cmd.description,
            serverSpecific: cmd.serverSpecific || false,
            category: categoryName,
          });
        } catch (err) {
          console.warn(`Error loading command file ${f}: ${err?.message ?? err}`);
        }
      }

      if (categoryCommands.length > 0) {
        categoryCommands.sort((a, b) => {
          const n1 = (a.name || "").toLowerCase().trim();
          const n2 = (b.name || "").toLowerCase().trim();
          return n1.localeCompare(n2);
        });
        categories[categoryName] = {
          commands: categoryCommands,
        };
      }
    } catch (err) {
      console.warn(`Error processing folder ${folder}: ${err?.message ?? err}`);
    }
  }
  return categories;
};

const createPages = (commands) => {
  const pages = [];
  const arr = Array.isArray(commands) ? commands : [];
  for (let i = 0; i < arr.length; i += CMD_PER_PAGE) {
    pages.push(arr.slice(i, i + CMD_PER_PAGE));
  }
  return pages;
};

const createCategoryEmbed = (categories, searchQuery = null) => {
  const keys = Object.keys(categories);
  if (keys.length === 0) {
    return new EmbedBuilder()
      .setTitle(searchQuery ? `📚 Search Results for "${searchQuery}"` : "📚 Help Menu - Categories")
      .setDescription("No categories available.")
      .setColor(0x5865f2)
      .setFooter({ text: `0 categories • Use the dropdown to select a category` });
  }

  const categoryList = keys
    .map((category) => {
      const count = categories[category].commands.length;
      return `**${capitalizeFirstLetter(category)}** (${count} command${count !== 1 ? "s" : ""})`;
    })
    .join("\n");

  const title = searchQuery ? `📚 Search Results for "${searchQuery}"` : "📚 Help Menu - Categories";
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`Select a category to view its commands:\n\n${categoryList}`)
    .setColor(0x5865f2)
    .setFooter({
      text: `${keys.length} categories • Use the dropdown to select a category`,
    });

  return embed;
};

const createCommandEmbed = (page, currentPage, totalPages, category, categories, searchQuery = null) => {
  const formattedCommands = getFormattedData(page);
  const title = searchQuery
    ? `📚 Search Results for "${searchQuery}" in ${capitalizeFirstLetter(category)}`
    : `${capitalizeFirstLetter(category)} Commands`;
  
  const description = Array.isArray(formattedCommands) ? formattedCommands.join("") : String(formattedCommands);
  
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description || "No commands to show.")
    .setColor(0x5865f2)
    .setFooter({
      text: `Page ${Math.max(1, currentPage + 1)}/${Math.max(1, totalPages)} • ${
        Array.isArray(page) ? page.length : 0
      } commands on this page`,
    });
};

const createCategorySelector = (categories, currentCategory = null) => {
  const keys = Object.keys(categories || {});
  const options = [];
  
  options.push({
    label: "All Categories",
    description: "View all command categories",
    value: "all_categories",
    default: currentCategory === null,
  });

  for (const category of keys.slice(0, MAX_SELECT_OPTIONS - 1)) {
    const labelRaw = capitalizeFirstLetter(category);
    const label = labelRaw.length > 100 ? labelRaw.slice(0, 97) + "..." : labelRaw;
    const descRaw = `${categories[category].commands.length} command${
      categories[category].commands.length !== 1 ? "s" : ""
    }`;
    const description = descRaw.length > 100 ? descRaw.slice(0, 97) + "..." : descRaw;
    
    options.push({
      label,
      description,
      value: category,
      default: currentCategory === category,
    });
  }

  if (keys.length > MAX_SELECT_OPTIONS - 1) {
    options.push({
      label: "More categories...",
      description: `Show full list of ${keys.length} categories (ephemeral)`,
      value: "more_categories",
      default: false,
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("help_category_select")
    .setPlaceholder("Select a category...")
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(selectMenu);
};

const createNavigationButtons = (currentPage, totalPages) => {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("help_first").setLabel("⏪").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
    new ButtonBuilder().setCustomId("help_previous").setLabel("◀️").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
    new ButtonBuilder().setCustomId("help_next").setLabel("▶️").setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder().setCustomId("help_last").setLabel("⏩").setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder().setCustomId("help_back_to_categories").setLabel("🏠 Categories").setStyle(ButtonStyle.Secondary)
  );
  return row;
};

const searchCommands = (categories, query) => {
  const normalizedQuery = String(query ?? "").toLowerCase().trim();
  const results = {};
  
  for (const [category, categoryData] of Object.entries(categories || {})) {
    const filtered = (categoryData.commands || []).filter((cmd) => {
      const name = String(cmd.name ?? "").toLowerCase();
      const desc = String(cmd.description ?? "").toLowerCase();
      return name.includes(normalizedQuery) || desc.includes(normalizedQuery);
    });
    
    if (filtered.length > 0) {
      results[category] = {
        commands: filtered,
      };
    }
  }
  return results;
};

const handleHelp = async (client, message) => {
  try {
    const options = message.content.split(/\s+/).slice(3);
    const commandQuery = options.length > 0 ? options.join(" ") : null;

    const categories = getCategorizedCommands(path.join(__dirname, ".."), message);
    
    if (Object.keys(categories).length === 0) {
      return message.reply("No commands found.");
    }

    let filteredCategories = categories;
    let searchQuery = null;

    if (commandQuery) {
      filteredCategories = searchCommands(categories, commandQuery);
      searchQuery = commandQuery;
      
      if (Object.keys(filteredCategories).length === 0) {
        return message.reply(`No commands found matching "${commandQuery}".`);
      }
    }

    const embed = createCategoryEmbed(filteredCategories, searchQuery);
    const categorySelector = createCategorySelector(filteredCategories);

    const response = await message.reply({
      embeds: [embed],
      components: [categorySelector],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (selectInteraction) => selectInteraction.user.id === message.author.id,
      time: 300000,
    });

    const buttonCollector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (buttonInteraction) => buttonInteraction.user.id === message.author.id,
      time: 300000,
    });

    let currentCategory = null;
    let currentPage = 0;
    let pages = [];

    collector.on("collect", async (selectInteraction) => {
      const selectedValue = selectInteraction.values[0];

      if (selectedValue === "more_categories") {
        const keys = Object.keys(filteredCategories);
        const list = keys
          .map((k) => `${capitalizeFirstLetter(k)} (${filteredCategories[k].commands.length})`)
          .join("\n");
        return selectInteraction.reply({ content: `All categories:\n\n${list}`, ephemeral: true });
      }

      if (selectedValue === "all_categories") {
        currentCategory = null;
        const embed = createCategoryEmbed(filteredCategories, searchQuery);
        const categorySelector = createCategorySelector(filteredCategories, currentCategory);
        return selectInteraction.update({
          embeds: [embed],
          components: [categorySelector],
        });
      }

      if (!filteredCategories[selectedValue]) {
        return selectInteraction.update({ content: "Selected category not found.", embeds: [], components: [] }).catch(() => {});
      }

      currentCategory = selectedValue;
      const categoryCommands = filteredCategories[selectedValue].commands || [];
      pages = createPages(categoryCommands);
      currentPage = 0;

      const cmdEmbed = createCommandEmbed(pages[currentPage] || [], currentPage, Math.max(1, pages.length), selectedValue, filteredCategories, searchQuery);
      const components = [createCategorySelector(filteredCategories, currentCategory)];
      
      if (pages.length > 1) components.push(createNavigationButtons(currentPage, pages.length));
      else
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("help_back_to_categories").setLabel("🏠 Categories").setStyle(ButtonStyle.Secondary)
          )
        );

      await selectInteraction.update({
        embeds: [cmdEmbed],
        components,
      });
    });

    buttonCollector.on("collect", async (buttonInteraction) => {
      try {
        if (!currentCategory) {
          if (buttonInteraction.customId === "help_back_to_categories") {
            return buttonInteraction.update({
              embeds: [createCategoryEmbed(filteredCategories, searchQuery)],
              components: [createCategorySelector(filteredCategories)],
            });
          }
          return buttonInteraction.reply({ content: "No category selected.", ephemeral: true });
        }

        if (!Array.isArray(pages) || pages.length === 0) {
          return buttonInteraction.reply({ content: "No pages available for this category.", ephemeral: true });
        }

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
          case "help_back_to_categories":
            currentCategory = null;
            return buttonInteraction.update({
              embeds: [createCategoryEmbed(filteredCategories, searchQuery)],
              components: [createCategorySelector(filteredCategories)],
            });
          default:
            return buttonInteraction.reply({ content: "Unknown button.", ephemeral: true });
        }

        const cmdEmbed = createCommandEmbed(pages[currentPage] || [], currentPage, Math.max(1, pages.length), currentCategory, filteredCategories, searchQuery);
        const components = [createCategorySelector(filteredCategories, currentCategory)];
        
        if (pages.length > 1) components.push(createNavigationButtons(currentPage, pages.length));
        else
          components.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("help_back_to_categories").setLabel("🏠 Categories").setStyle(ButtonStyle.Secondary)
            )
          );

        await buttonInteraction.update({ embeds: [cmdEmbed], components });
      } catch (err) {
        console.warn("Error handling button interaction:", err);
        try {
          await buttonInteraction.reply({ content: "An error occurred while navigating pages.", ephemeral: true });
        } catch {}
      }
    });

    collector.on("end", () => {
      try {
        const disabledComponents = (response.components || []).map((row) => {
          const newRow = ActionRowBuilder.from(row);
          newRow.components.forEach((c) => {
            try {
              c.setDisabled(true);
            } catch {}
          });
          return newRow;
        });
        if (disabledComponents.length) {
          message.channel.messages.fetch(response.id).then(msg => {
            msg.edit({ components: disabledComponents }).catch(() => {});
          }).catch(() => {});
        }
      } catch (err) {}
    });
  } catch (error) {
    console.log(error);
    try {
      message.reply("An error occurred while processing the help command.");
    } catch (editError) {
      console.log("Could not send error message:", editError);
    }
  }
};

module.exports = {
  name: "list",
  description: "Shows a categorized help menu with pagination and search.",
  options: [
    {
      name: "query",
    },
  ],
  callback: handleHelp,
};
