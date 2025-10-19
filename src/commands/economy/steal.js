/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

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
  
const CONFIG = {  
  MAX_STEAL_AMOUNT: 10000,  
  BASE_SUCCESS_CHANCE: 0.6,  
  CHANCE_REDUCTION_PER_COIN: 0.001,  
  MIN_SUCCESS_CHANCE: 0.005,  
  PENALTY_MULTIPLIER: 5,  
  BUTTON_TIMEOUT: 30000,  
};  
  
const calculateSuccessChance = (amount) => {  
  const chance = CONFIG.BASE_SUCCESS_CHANCE - (CONFIG.CHANCE_REDUCTION_PER_COIN * amount);  
  return Math.max(CONFIG.MIN_SUCCESS_CHANCE, Math.min(CONFIG.BASE_SUCCESS_CHANCE, chance));  
};  
  
const calculatePenalty = (amount) => {  
  const penalty = Math.floor(Math.sqrt(amount) * CONFIG.PENALTY_MULTIPLIER);  
  return Math.max(1, penalty);  
};  
  
const getRandomScenarioText = (isSuccess, targetName, stealerName) => {  
  const successMessages = [  
    `🥷 ${stealerName} silently slipped into ${targetName}'s wallet and made off with the loot!`,  
    `🎭 ${stealerName} pulled off a masterful heist, leaving ${targetName} none the wiser!`,  
    `🔓 ${stealerName} cracked the code and successfully raided ${targetName}'s stash!`,  
    `🌙 Under cover of darkness, ${stealerName} executed the perfect steal from ${targetName}!`,  
    `🎯 ${stealerName}'s precision strike left ${targetName}'s wallet significantly lighter!`,  
  ];  
  const failureMessages = [  
    `🚨 ${targetName} caught ${stealerName} red-handed! The heist backfired spectacularly!`,  
    `🛡️ ${targetName}'s security system activated! ${stealerName} triggered the alarm!`,  
    `👮 The theft was foiled! ${stealerName} got caught and had to pay compensation!`,  
    `🔒 ${targetName}'s vault was too secure! ${stealerName}'s attempt failed miserably!`,  
    `⚡ ${stealerName}'s clumsy attempt alerted ${targetName} immediately!`,  
  ];  
  const messages = isSuccess ? successMessages : failureMessages;  
  const randomIndex = Math.floor(Math.random() * messages.length);  
  return messages[randomIndex];  
};  
  
const createHeistAttemptEmbed = (stealerName, targetName, amount, successChance, chancesLeft) => {  
  return new EmbedBuilder()  
    .setTitle("🎲 Heist in Progress!")  
    .setDescription(`**${stealerName}** is attempting to steal **${amount.toLocaleString()}** coins from **${targetName}**!`)  
    .addFields(  
      { name: "🎯 Target", value: targetName, inline: true },  
      { name: "💰 Amount", value: amount.toLocaleString(), inline: true },  
      { name: "📊 Success Chance", value: `${(successChance * 100).toFixed(1)}%`, inline: true },  
      { name: "🔁 Chances Left", value: `${chancesLeft}/5`, inline: true }  
    )  
    .setColor("#FFA500")  
    .setFooter({ text: "Will the heist succeed? Click to find out!" })  
    .setTimestamp();  
};  
  
const createSuccessEmbed = (scenarioText, amount, stealerBalance, targetBalance) => {  
  return new EmbedBuilder()  
    .setTitle("🎉 Heist Successful!")  
    .setDescription(scenarioText)  
    .addFields(  
      { name: "💵 Stolen", value: `${amount.toLocaleString()} coins`, inline: true },  
      { name: "📈 New Balance", value: `${stealerBalance.toLocaleString()} coins`, inline: true },  
      { name: "📉 Victim Balance", value: `${targetBalance.toLocaleString()} coins`, inline: true }  
    )  
    .setColor("#00FF00")  
    .setFooter({ text: "Crime pays... sometimes!" })  
    .setTimestamp();  
};  
  
const createFailureEmbed = (scenarioText, penalty, stealerBalance, targetBalance) => {  
  return new EmbedBuilder()  
    .setTitle("🚫 Heist Failed!")  
    .setDescription(scenarioText)  
    .addFields(  
      { name: "💸 Penalty Paid", value: `${penalty.toLocaleString()} coins`, inline: true },  
      { name: "📉 New Balance", value: `${stealerBalance.toLocaleString()} coins`, inline: true },  
      { name: "💰 Victim Compensation", value: `${targetBalance.toLocaleString()} coins`, inline: true }  
    )  
    .setColor("#FF0000")  
    .setFooter({ text: "Crime doesn't always pay!" })  
    .setTimestamp();  
};  
  
const createErrorEmbed = (errorMessage) => {  
  return new EmbedBuilder()  
    .setTitle("❌ Heist Error")  
    .setDescription(errorMessage)  
    .setColor("#FF4444")  
    .setTimestamp();  
};

const createCooldownEmbed = (remainingTime) => {  
  return new EmbedBuilder()  
    .setTitle("⏰ Steal Cooldown")  
    .setDescription(`🛑 You've used all your 5 steal attempts for today!\n\n⏳ Wait for **${remainingTime}** until your steal chances reset.`)  
    .setColor("#FF6600")  
    .setFooter({ text: "Come back tomorrow for more heist opportunities!" })  
    .setTimestamp();  
};  
  
const createHeistButtons = () => {  
  const executeButton = new ButtonBuilder()  
    .setCustomId("execute_heist")  
    .setLabel("🎲 Execute Heist")  
    .setStyle(ButtonStyle.Danger);  
  const cancelButton = new ButtonBuilder()  
    .setCustomId("cancel_heist")  
    .setLabel("❌ Cancel")  
    .setStyle(ButtonStyle.Secondary);  
  return new ActionRowBuilder().addComponents(executeButton, cancelButton);  
};  
  
const validateStealAttempt = (targetUser, interaction, amount) => {  
  const errors = [];  
  if (targetUser.id === interaction.user.id) {  
    errors.push("🤦 You cannot steal from yourself!");  
  }  
  if (targetUser.bot) {  
    errors.push("🤖 You cannot steal from bots!");  
  }  
  if (!Number.isFinite(amount) || amount <= 0) {  
    errors.push("💸 Amount must be a valid number above zero!");  
  }  
  if (amount > CONFIG.MAX_STEAL_AMOUNT) {  
    errors.push(`🏦 Max steal attempt is ${CONFIG.MAX_STEAL_AMOUNT.toLocaleString()} coins!`);  
  }  
  return errors;  
};  
  
const getUserDisplayNames = (targetUser, interaction) => {  
  const targetMember = interaction.guild.members.cache.get(targetUser.id);  
  const stealerMember = interaction.member;  
  return {  
    targetName: targetMember?.displayName || targetUser.username,  
    stealerName: stealerMember?.displayName || interaction.user.username,  
  };  
};  
  
const getUserDocuments = async (targetUser, interaction, session) => {  
  const targetQuery = { guildId: interaction.guild.id, userId: targetUser.id };  
  const stealerQuery = { guildId: interaction.guild.id, userId: interaction.user.id };  
  const [targetDoc, stealerDoc] = await Promise.all([  
    User.findOneAndUpdate(targetQuery, { $setOnInsert: { balance: 0 } }, { new: true, upsert: true, session }),  
    User.findOneAndUpdate(stealerQuery, { $setOnInsert: { balance: 0, stealChancesLeft: 5, lastSteal: null } }, { new: true, upsert: true, session }),  
  ]);  
  return { targetDoc, stealerDoc };  
};  
  
const processSuccessfulSteal = async (targetUser, interaction, amount, session) => {  
  const now = new Date();  
  const targetQuery = { guildId: interaction.guild.id, userId: targetUser.id };  
  const stealerQuery = { guildId: interaction.guild.id, userId: interaction.user.id };  
  const [updatedTarget, updatedStealer] = await Promise.all([  
    User.findOneAndUpdate(targetQuery, { $inc: { balance: -amount } }, { new: true, session }),  
    User.findOneAndUpdate(stealerQuery, { $inc: { balance: amount, stealChancesLeft: -1 }, $set: { lastSteal: now } }, { new: true, session }),  
  ]);  
  return { updatedTarget, updatedStealer };  
};  
  
const processFailedSteal = async (targetUser, interaction, penalty, session) => {  
  const now = new Date();  
  const targetQuery = { guildId: interaction.guild.id, userId: targetUser.id };  
  const stealerQuery = { guildId: interaction.guild.id, userId: interaction.user.id };  
  const [updatedTarget, updatedStealer] = await Promise.all([  
    User.findOneAndUpdate(targetQuery, { $inc: { balance: penalty } }, { new: true, session }),  
    User.findOneAndUpdate(stealerQuery, { $inc: { balance: -penalty, stealChancesLeft: -1 }, $set: { lastSteal: now } }, { new: true, session }),  
  ]);  
  return { updatedTarget, updatedStealer };  
};  
  
const handleButtonClick = async (buttonInteraction, interaction, targetUser, amount, targetName, stealerName) => {  
  if (buttonInteraction.user.id !== interaction.user.id) {  
    return buttonInteraction.reply({  
      content: "🚫 Only the initiator can control this heist!",  
      flags: MessageFlags.Ephemeral,  
    });  
  }  
  if (buttonInteraction.customId === "cancel_heist") {  
    await buttonInteraction.update({  
      embeds: [createErrorEmbed("🏃 The heist was cancelled.")],  
      components: [],  
    });  
    return "cancelled";  
  }  
  if (buttonInteraction.customId === "execute_heist") {  
    await buttonInteraction.deferUpdate();  
    return await executeHeist(buttonInteraction, targetUser, interaction, amount, targetName, stealerName);  
  }  
};  
  
const executeHeist = async (buttonInteraction, targetUser, interaction, amount, targetName, stealerName) => {  
  const session = await User.startSession();  
  try {  
    await session.withTransaction(async () => {  
      const { targetDoc, stealerDoc } = await getUserDocuments(targetUser, interaction, session);  
  
      if (targetDoc.balance < amount) {  
        throw new Error(`💸 ${targetName} only has **${targetDoc.balance.toLocaleString()}** coins!`);  
      }  
  
      const successChance = calculateSuccessChance(amount);  
      const isSuccess = successChance > Math.random();  
  
      if (isSuccess) {  
        const { updatedTarget, updatedStealer } = await processSuccessfulSteal(targetUser, interaction, amount, session);  
        const scenarioText = getRandomScenarioText(true, targetName, stealerName);  
        const resultEmbed = createSuccessEmbed(scenarioText, amount, updatedStealer.balance, updatedTarget.balance);  
        await buttonInteraction.editReply({ embeds: [resultEmbed], components: [] });  
      } else {  
        const penalty = calculatePenalty(amount);  
        const actualPenalty = Math.min(penalty, stealerDoc.balance);  
        const { updatedTarget, updatedStealer } = await processFailedSteal(targetUser, interaction, actualPenalty, session);  
        const scenarioText = getRandomScenarioText(false, targetName, stealerName) + (actualPenalty < penalty ? " (Partial penalty - you're broke!)" : "");  
        const resultEmbed = createFailureEmbed(scenarioText, actualPenalty, updatedStealer.balance, updatedTarget.balance);  
        await buttonInteraction.editReply({ embeds: [resultEmbed], components: [] });  
      }  
    });  
    await session.endSession();  
    return "executed";  
  } catch (error) {  
    await session.endSession();  
    if (error.message && error.message.startsWith("💸")) {  
      await buttonInteraction.editReply({  
        embeds: [createErrorEmbed(error.message)],  
        components: [],  
      });  
    } else {  
      console.error("Steal error:", error);  
      await buttonInteraction.editReply({  
        embeds: [createErrorEmbed("🤕 An unexpected error occurred during the heist!")],  
        components: [],  
      });  
    }  
    return "error";  
  }  
};  
  
const handleCollectorTimeout = async (interaction) => {  
  try {  
    await interaction.editReply({  
      embeds: [createErrorEmbed("⏰ Heist window expired!")],  
      components: [],  
    });  
  } catch (error) {}  
};  
  
const handleSteal = async (client, interaction) => {  
  const targetUser = interaction.options.getUser("victim");  
  const amountInput = interaction.options.get("amount").value;  
  const amount = Math.floor(parseAmount(amountInput));  
  const { targetName, stealerName } = getUserDisplayNames(targetUser, interaction);  
  
  let stealerDoc = await User.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });  
  if (!stealerDoc) {  
    stealerDoc = await User.create({  
      guildId: interaction.guild.id,  
      userId: interaction.user.id,  
      balance: 0,  
      lastDaily: null,  
      lastSteal: null,  
      stealChancesLeft: 5,  
    });  
  }  
  
  const now = new Date();  
  const lastStealDate = stealerDoc.lastSteal ? stealerDoc.lastSteal.toDateString() : null;  
  const today = now.toDateString();  
  if (lastStealDate !== today) {  
    stealerDoc.stealChancesLeft = 5;  
    await stealerDoc.save();  
  }  
  
  if (stealerDoc.stealChancesLeft <= 0) {
    if (stealerDoc.lastSteal) {
      // Calculate next steal time (24 hours after last steal)
      const nextSteal = new Date(stealerDoc.lastSteal.getTime() + 24 * 60 * 60 * 1000);
      const remainingTime = nextSteal - now;

      if (remainingTime > 0) {
        const { default: prettyMs } = await import("pretty-ms");
        const durationTime = prettyMs(remainingTime, { unitCount: 2, milliseconds: false });

        const reply = await interaction.reply({  
          embeds: [createCooldownEmbed(durationTime)],  
          flags: MessageFlags.Ephemeral,  
        });
        
        // Auto-delete the reply after 5 seconds
        setTimeout(() => {
          interaction.deleteReply(reply).catch(() => {});
        }, 5000);
        
        return;
      }
    }
  }  
  
  const validationErrors = validateStealAttempt(targetUser, interaction, amount);  
  if (validationErrors.length > 0) {  
    return interaction.reply({  
      embeds: [createErrorEmbed(validationErrors[0])],  
      flags: MessageFlags.Ephemeral,  
    });  
  }  
  
  try {  
    await interaction.deferReply();  
    const successChance = calculateSuccessChance(amount);  
    const initialEmbed = createHeistAttemptEmbed(stealerName, targetName, amount, successChance, stealerDoc.stealChancesLeft);  
    const actionRow = createHeistButtons();  
    const response = await interaction.editReply({  
      embeds: [initialEmbed],  
      components: [actionRow],  
    });  
  
    const collector = response.createMessageComponentCollector({  
      componentType: ComponentType.Button,  
      time: CONFIG.BUTTON_TIMEOUT,  
    });  
  
    collector.on("collect", async (buttonInteraction) => {  
      const result = await handleButtonClick(buttonInteraction, interaction, targetUser, amount, targetName, stealerName);  
      if (result === "cancelled" || result === "executed") {  
        collector.stop(result);  
      }  
    });  
  
    collector.on("end", async (_, reason) => {  
      if (reason === "time") {  
        await handleCollectorTimeout(interaction);  
      }  
    });  
  } catch (error) {  
    console.error("Setup error:", error);  
    await interaction.editReply({  
      embeds: [createErrorEmbed("🤕 An error occurred setting up the heist!")],  
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
  cooldown: 5000,
  serverSpecific: true,  
  callback: handleSteal,  
};
