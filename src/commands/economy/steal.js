const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const User = require("../../models/User");
const parseAmount = require("../../utils/parseAmount");

// Chance of success decreases quickly with amount
const getStealChance = (amount) => {
  const baseChance = 0.6; // 60% max
  const aggressiveScaling = 0.001; // subtract 0.1% per coin
  const chance = baseChance - (aggressiveScaling * amount);

  return Math.max(0.005, Math.min(0.6, chance));
};

// Penalty scales with sqrt(amount)
const calculatePenalty = (amount) => {
  const scalingPenalty = Math.floor(Math.sqrt(amount) * 5);
  return Math.max(1, scalingPenalty);
};

// Randomized flavor text
const getHeistScenario = (success, amount, targetName, stealerName) => {
  const scenarios = {
    success: [
      `🥷 ${stealerName} silently slipped into ${targetName}'s wallet and made off with the loot!`,
      `🎭 ${stealerName} pulled off a masterful heist, leaving ${targetName} none the wiser!`,
      `🔓 ${stealerName} cracked the code and successfully raided ${targetName}'s stash!`,
      `🌙 Under cover of darkness, ${stealerName} executed the perfect steal from ${targetName}!`,
      `🎯 ${stealerName}'s precision strike left ${targetName}'s wallet significantly lighter!`,
    ],
    failure: [
      `🚨 ${targetName} caught ${stealerName} red-handed! The heist backfired spectacularly!`,
      `🛡️ ${targetName}'s security system activated! ${stealerName} triggered the alarm!`,
      `👮 The theft was foiled! ${stealerName} got caught and had to pay compensation!`,
      `🔒 ${targetName}'s vault was too secure! ${stealerName}'s attempt failed miserably!`,
      `⚡ ${stealerName}'s clumsy attempt alerted ${targetName} immediately!`,
    ],
  };

  const selected = scenarios[success ? "success" : "failure"];
  return selected[Math.floor(Math.random() * selected.length)];
};

// Embed generator
const createStealEmbed = (type, data) => {
  const embed = new EmbedBuilder().setTimestamp();

  switch (type) {
    case "attempt":
      return embed
        .setTitle("🎲 Heist in Progress!")
        .setDescription(
          `**${data.stealerName}** is attempting to steal **${data.amount.toLocaleString()}** coins from **${data.targetName}**!`
        )
        .addFields(
          { name: "🎯 Target", value: data.targetName, inline: true },
          { name: "💰 Amount", value: data.amount.toLocaleString(), inline: true },
          { name: "📊 Success Chance", value: `${(data.chance * 100).toFixed(1)}%`, inline: true }
        )
        .setColor("#FFA500")
        .setFooter({ text: "Will the heist succeed? Click to find out!" });

    case "success":
      return embed
        .setTitle("🎉 Heist Successful!")
        .setDescription(data.scenario)
        .addFields(
          { name: "💵 Stolen", value: `${data.amount.toLocaleString()} coins`, inline: true },
          { name: "📈 New Balance", value: `${data.stealerBalance.toLocaleString()} coins`, inline: true },
          { name: "📉 Victim Balance", value: `${data.targetBalance.toLocaleString()} coins`, inline: true }
        )
        .setColor("#00FF00")
        .setFooter({ text: "Crime pays... sometimes!" });

    case "failure":
      return embed
        .setTitle("🚫 Heist Failed!")
        .setDescription(data.scenario)
        .addFields(
          { name: "💸 Penalty Paid", value: `${data.penalty.toLocaleString()} coins`, inline: true },
          { name: "📉 New Balance", value: `${data.stealerBalance.toLocaleString()} coins`, inline: true },
          { name: "💰 Victim Compensation", value: `${data.targetBalance.toLocaleString()} coins`, inline: true }
        )
        .setColor("#FF0000")
        .setFooter({ text: "Crime doesn't always pay!" });

    case "error":
      return embed
        .setTitle("❌ Heist Error")
        .setDescription(data.message)
        .setColor("#FF4444");

    default:
      return embed.setTitle("Unknown Error").setColor("#FF0000");
  }
};

const handleSteal = async (client, interaction) => {
  const targetUser = interaction.options.getUser("victim");
  const amountOpt = interaction.options.get("amount").value;

  const targetMember = interaction.guild.members.cache.get(targetUser.id) || null;
  const targetName = targetMember?.displayName || targetUser.username;
  const stealerMember = interaction.member;
  const stealerName = stealerMember?.displayName || interaction.user.username;

  if (targetUser.id === interaction.user.id) {
    return interaction.reply({
      embeds: [createStealEmbed("error", { message: "🤦 You cannot steal from yourself!" })],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (targetUser.bot) {
    return interaction.reply({
      embeds: [createStealEmbed("error", { message: "🤖 You cannot steal from bots!" })],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await interaction.deferReply();

    const amount = parseAmount(amountOpt);
    if (!Number.isFinite(amount) || amount <= 0) {
      return interaction.editReply({
        embeds: [createStealEmbed("error", { message: "💸 Amount must be a valid number above zero!" })],
      });
    }

    const roundedAmount = Math.floor(amount);
    if (roundedAmount > 10000) {
      return interaction.editReply({
        embeds: [createStealEmbed("error", { message: "🏦 Max steal attempt is 10,000 coins!" })],
      });
    }

    const stealChance = getStealChance(roundedAmount);

    const initialEmbed = createStealEmbed("attempt", {
      stealerName,
      targetName,
      amount: roundedAmount,
      chance: stealChance,
    });

    const executeButton = new ButtonBuilder()
      .setCustomId("execute_heist")
      .setLabel("🎲 Execute Heist")
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId("cancel_heist")
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder().addComponents(executeButton, cancelButton);

    const response = await interaction.editReply({
      embeds: [initialEmbed],
      components: [actionRow],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    collector.on("collect", async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          content: "🚫 Only the initiator can control this heist!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (buttonInteraction.customId === "cancel_heist") {
        collector.stop("cancelled");
        await buttonInteraction.update({
          embeds: [createStealEmbed("error", { message: "🏃 The heist was cancelled." })],
          components: [],
        });
        return;
      }

      if (buttonInteraction.customId === "execute_heist") {
        collector.stop("executed");
        await buttonInteraction.deferUpdate();
        const session = await User.startSession();

        try {
          await session.withTransaction(async () => {
            const targetQuery = { guildId: interaction.guild.id, userId: targetUser.id };
            const stealerQuery = { guildId: interaction.guild.id, userId: interaction.user.id };

            const [targetDoc, stealerDoc] = await Promise.all([
              User.findOneAndUpdate(targetQuery, { $setOnInsert: { balance: 0 } }, { new: true, upsert: true, session }),
              User.findOneAndUpdate(stealerQuery, { $setOnInsert: { balance: 0 } }, { new: true, upsert: true, session }),
            ]);

            if (targetDoc.balance < roundedAmount) {
              throw new Error(`💸 ${targetName} only has **${targetDoc.balance.toLocaleString()}** coins!`);
            }

            const success = stealChance > Math.random();
            let resultEmbed;

            if (success) {
              const [updatedTarget, updatedStealer] = await Promise.all([
                User.findOneAndUpdate(targetQuery, { $inc: { balance: -roundedAmount } }, { new: true, session }),
                User.findOneAndUpdate(stealerQuery, { $inc: { balance: roundedAmount } }, { new: true, session }),
              ]);

              resultEmbed = createStealEmbed("success", {
                scenario: getHeistScenario(true, roundedAmount, targetName, stealerName),
                amount: roundedAmount,
                stealerBalance: updatedStealer.balance,
                targetBalance: updatedTarget.balance,
              });
            } else {
              const penalty = calculatePenalty(roundedAmount);
              const actualPenalty = Math.min(penalty, stealerDoc.balance);

              const [updatedTarget, updatedStealer] = await Promise.all([
                User.findOneAndUpdate(targetQuery, { $inc: { balance: actualPenalty } }, { new: true, session }),
                User.findOneAndUpdate(stealerQuery, { $inc: { balance: -actualPenalty } }, { new: true, session }),
              ]);

              resultEmbed = createStealEmbed("failure", {
                scenario: getHeistScenario(false, roundedAmount, targetName, stealerName) +
                  (actualPenalty < penalty ? " (Partial penalty - you’re broke!)" : ""),
                penalty: actualPenalty,
                stealerBalance: updatedStealer.balance,
                targetBalance: updatedTarget.balance,
              });
            }

            await buttonInteraction.editReply({ embeds: [resultEmbed], components: [] });
          });
        } catch (error) {
          await session.endSession();
          if (error.message.startsWith("💸")) {
            await buttonInteraction.editReply({
              embeds: [createStealEmbed("error", { message: error.message })],
              components: [],
            });
          } else {
            console.error("Steal error:", error);
            await buttonInteraction.editReply({
              embeds: [createStealEmbed("error", { message: "🤕 An unexpected error occurred during the heist!" })],
              components: [],
            });
          }
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        try {
          await interaction.editReply({
            embeds: [createStealEmbed("error", { message: "⏰ Heist window expired!" })],
            components: [],
          });
        } catch {}
      }
    });
  } catch (error) {
    console.error("Setup error:", error);
    await interaction.editReply({
      embeds: [createStealEmbed("error", { message: "🤕 An error occurred setting up the heist!" })],
      components: [],
    });
  }
};

module.exports = {
  name: "steal",
  description: "Attempt to steal money from another user (with risk!)",
  options: [
    {
      name: "victim",
      description: "The user you want to steal from",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "amount",
      description: "Amount you want to try to steal",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  serverSpecific: true,
  callback: handleSteal,
};
