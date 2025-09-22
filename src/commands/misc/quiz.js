const {
  Client,
  Interaction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} = require("discord.js");

const API_URL = "https://rapido.zetsu.xyz/api/quiz";

/**
 * @param {Client} client
 * @param {Interaction} interaction
 */
const handleQuiz = async (client, interaction) => {
  try {
    await interaction.deferReply();

    // Fixed: await the fetch call
    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("non-200 status");

    const json = await response.json();

    // Create buttons for each option
    const buttons = json.options.map((option, index) =>
      new ButtonBuilder()
        .setCustomId(`quiz_${index}`)
        .setLabel(option)
        .setStyle(ButtonStyle.Primary),
    );

    const choicesButtons = new ActionRowBuilder().addComponents(buttons);

    // Create initial embed
    const quizEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("📝 Quiz Time!")
      .setDescription(json.question)
      .addFields({
        name: "⏱️ Time Limit",
        value: "30 seconds",
        inline: true,
      })
      .setFooter({ text: "Click a button to answer!" })
      .setTimestamp();

    const quizMessage = await interaction.editReply({
      embeds: [quizEmbed],
      components: [choicesButtons],
    });

    const collector = quizMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000, // 30 seconds timeout
    });

    collector.on("collect", async (buttonInteraction) => {
      const selectedIndex = parseInt(buttonInteraction.customId.split("_")[1]);
      const selectedAnswer = json.options[selectedIndex];
      const isCorrect = selectedAnswer === json.correct_answer;

      const disabledButtons = json.options.map((option, index) => {
        const button = new ButtonBuilder()
          .setCustomId(`quiz_${index}`)
          .setLabel(option)
          .setDisabled(true);

        if (option === json.correct_answer) {
          button.setStyle(ButtonStyle.Success); // Green for correct answer
        } else if (index === selectedIndex && !isCorrect) {
          button.setStyle(ButtonStyle.Danger); // Red for wrong selection
        } else {
          button.setStyle(ButtonStyle.Secondary); // Gray for other options
        }

        return button;
      });

      const finalRow = new ActionRowBuilder().addComponents(disabledButtons);

      let resultEmbed = new EmbedBuilder().setTimestamp();

      if (isCorrect) {
        resultEmbed
          .setColor(0x00ff00)
          .setTitle("🎉 Correct Answer!")
          .setDescription(json.question)
          .addFields(
            {
              name: "✅ Winner",
              value: `${buttonInteraction.user} got it right!`,
              inline: true,
            },
            {
              name: "📝 Answer",
              value: selectedAnswer,
              inline: true,
            },
          );
      } else {
        resultEmbed
          .setColor(0xff0000)
          .setTitle("❌ Wrong Answer!")
          .setDescription(json.question)
          .addFields(
            {
              name: "❌ Answered by",
              value: buttonInteraction.user.toString(),
              inline: true,
            },
            {
              name: "📝 Your Answer",
              value: selectedAnswer,
              inline: true,
            },
            {
              name: "✅ Correct Answer",
              value: json.correct_answer,
              inline: true,
            },
          );
      }

      await buttonInteraction.update({
        embeds: [resultEmbed],
        components: [finalRow],
      });

      collector.stop();
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        const disabledButtons = json.options.map((option, index) => {
          const button = new ButtonBuilder()
            .setCustomId(`quiz_${index}`)
            .setLabel(option)
            .setDisabled(true);

          if (option === json.correct_answer) {
            button.setStyle(ButtonStyle.Success);
          } else {
            button.setStyle(ButtonStyle.Secondary);
          }

          return button;
        });

        const finalRow = new ActionRowBuilder().addComponents(disabledButtons);

        const timeoutEmbed = new EmbedBuilder()
          .setColor(0xffff00) // Yellow
          .setTitle("⏰ Time's Up!")
          .setDescription(json.question)
          .addFields({
            name: "✅ Correct Answer",
            value: json.correct_answer,
            inline: true,
          })
          .setFooter({ text: "Better luck next time!" })
          .setTimestamp();

        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: [finalRow],
        });
      }
    });
  } catch (error) {
    console.error("Quiz error:", error);

    const errorMessage =
      "An error occurred whilst processing your request. Please try again later.";

    if (interaction.deferred) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("❌ Error")
            .setDescription(errorMessage)
            .setTimestamp(),
        ],
        components: [],
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("❌ Error")
            .setDescription(errorMessage)
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  }
};

module.exports = {
  name: "quiz",
  description: "Sends a random quiz question",
  cooldown: 5000,
  serverSpecific: true,
  callback: handleQuiz,
};
