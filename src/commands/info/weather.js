/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const {
  Client,
  Interaction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} = require("discord.js");

const formatCurrent = (json) => {
  const { location, current } = json;
  return `### 📍 Location: **${location.name}**
**Latitude:** ${location.lat} | **Longitude:** ${location.long}

### 🌦 Current Weather
- **Temperature:** ${current.temperature} °C (Feels like ${current.feelslike} °C)
- **Sky:** ${current.skytext}
- **Humidity:** ${current.humidity}%
- **Wind:** ${current.winddisplay}
- **Date:** ${current.date} at ${current.observationtime}`;
};

const formatForecast = (forecast) => {
  return forecast.map((day) => {
    return `**${day.day} (${day.date})**
- Low: ${day.low} °C / High: ${day.high} °C
- Sky: ${day.skytextday}
- 💧 Precipitation: ${day.precip}%`;
  });
};

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleWeather = async (client, interaction) => {
  const location = interaction.options.getString("location");
  try {
    await interaction.deferReply();

    const response = await fetch(
      `https://urangkapolka.vercel.app/api/weather?q=${encodeURI(
        location.trim().toLowerCase()
      )}`
    );

    if (!response.ok) throw new Error("non-200 weather response status");

    const json = await response.json();
    if (!json) throw new Error("no weather data found");

    const pages = [];
    const currentPage = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(json.location.name)
      .setDescription(formatCurrent(json))
      .setFooter({
        text: `Weather information for ${interaction.user.displayName}`,
        iconURL: interaction.user.avatarURL()
      })
      .setTimestamp();
    pages.push(currentPage);

    const forecastBlocks = formatForecast(json.forecast);
    const chunkSize = 2;
    for (let i = 0; i < forecastBlocks.length; i += chunkSize) {
      const chunk = forecastBlocks.slice(i, i + chunkSize).join("\n\n");
      const embed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(`${json.location.name} — Forecast`)
        .setDescription(`### 🔮 Forecast\n${chunk}`)
        .setFooter({
          text: `Weather information for ${interaction.user.displayName}`,
          iconURL: interaction.user.avatarURL()
        })
        .setTimestamp();
      pages.push(embed);
    }

    let pageIndex = 0;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("⬅️ Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pages.length === 1)
    );

    const msg = await interaction.editReply({
      embeds: [pages[pageIndex]],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600_000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "This isn’t your weather board.", flags: MessageFlags.Ephemeral });
      }

      if (i.customId === "prev") pageIndex--;
      if (i.customId === "next") pageIndex++;

      // Update buttons
      row.components[0].setDisabled(pageIndex === 0);
      row.components[1].setDisabled(pageIndex === pages.length - 1);

      await i.update({
        embeds: [pages[pageIndex]],
        components: [row]
      });
    });

    collector.on("end", async () => {
      row.components.forEach((btn) => btn.setDisabled(true));
      await msg.edit({ components: [row] });
    });
  } catch (error) {
    const errorEmbed = new EmbedBuilder()
      .setDescription(
        "An error occurred whilst fetching weather data. Try again later..."
      )
      .setColor("Red");
    await interaction.editReply({ embeds: [errorEmbed] });
    console.error(error);
  }
};

module.exports = {
  name: "weather",
  description: "Fetches weather based on the location",
  options: [
    {
      name: "location",
      description: "The location you want to check the weather",
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],
  cooldown: 10_000,
  callback: handleWeather
};
