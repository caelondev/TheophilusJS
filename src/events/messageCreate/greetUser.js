const { Client, Message } = require("discord.js");
const capitalizeFirstLetter = require("../../utils/capitalizeFirstLetter")
const cooldowns = new Set();

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = (client, message) => {
  if (message.author.bot || cooldowns.has(message.author.id)) return;

  const greetings = [
    "hi",
    "hello",
    "hey",
    "yo",
    "hai",
    "halo",
    "ey",
    "ellow",
    "hellow",
    "sup",
  ];

  const validEndings = ["", ",", " ", ".", "?", "!"];

  const messageContent = message.content.toLowerCase();
  const matchedGreeting = greetings.find(greeting => {
    return validEndings.some(ending => messageContent.startsWith(greeting + ending));
  });

  if (matchedGreeting) {
    message.reply({ content: `${capitalizeFirstLetter(matchedGreeting)}, **${message.author}**!` });
    cooldowns.add(message.author.id);
    setTimeout(() => {
      cooldowns.delete(message.author.id);
    }, 5000);
  }
};
