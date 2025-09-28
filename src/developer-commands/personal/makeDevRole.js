
const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "makedevrole",
  description: "Create a Developer role with Administrator permissions",
  /**
   * @param {import("discord.js").Client} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   */
  callback: async (client, message, args) => {
    try {
      const guild = message.guild;
      if (!guild) {
        return message.reply(
          "⚠️ This command can only be used inside a server.",
        );
      }

      // 🔍 Check if role already exists
      let devRole = guild.roles.cache.find((r) => r.name === "Developer");
      if (devRole) {
        return message.reply("⚠️ A role named **Developer** already exists.");
      }

      // ➕ Create Developer role
      devRole = await guild.roles.create({
        name: "Developer",
        color: 0x5865f2, // Discord blurple
        permissions: [PermissionsBitField.Flags.Administrator],
        reason: `Developer role created by ${message.author.tag}`,
      });

      // 🎁 Assign role to the user who ran the command
      await message.member.roles.add(devRole)

      return message.reply(
        "✅ Created **Developer** role and assigned it to you.",
      );
    } catch (err) {
      console.error("[makeDevRole] Error:", err);
      return message.reply(
        `❌ Failed to create Developer role: ${err.message}`,
      );
    }
  },
};
