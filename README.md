# TheophilusJS

> **Created by [caelondev](https://github.com/caelondev)**

A feature-rich Discord bot built with Discord.js, designed for seamless deployment and ease of use. TheophilusJS provides essential utility commands while maintaining a simple configuration system that allows users to customize their bot instance through a single configuration file.

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#%EF%B8%8F-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Event System Overview](#-event-system-overview)
- [Command System Overview](#-command-system-overview)
  - [Slash Command Workflow](#slash-command-workflow)
  - [Slash Command Example](#slash-command-example-annotated)
  - [TH Command Workflow](#th-custom-prefixed-command-workflow)
  - [TH Command Example](#th-command-example-annotated)
- [Developer Notes & Conventions](#-developer-notes--conventions)
- [Support & Contributing](#-support--contributing)
- [License](#-license)
- [Credits](#-credits)

---

## ✨ Features

- ✅ **Ready-to-Deploy** — Fully functional Discord bot with minimal setup required
- ✅ **Simple Configuration** — Customize your bot through a single `config.json` file
- ✅ **Integrated with MongoDB** — Store users' info automatically
- ✅ **Command System** — Comprehensive command handlers with admin controls
- ✅ **Event Handling** — Built-in modular Discord event management
- ✅ **Beginner Friendly** — Easy setup process with clear documentation
- ✅ **Stable & Reliable** — Built on Discord.js v14 for optimal performance

---

## 📦 Prerequisites

Before installing TheophilusJS, ensure you have the following:

- **[Node.js](https://nodejs.org/)** v18.0.0 or higher
- **npm** (comes with Node.js)
- **[Discord Bot Token](https://discord.com/developers/applications)** — Create a bot application
- **[Groq API Key](https://console.groq.com)** (used for AI logic)
- **[MongoDB Cluster](https://cloud.mongodb.com)** — Database connection
- **Discord Server** with appropriate permissions to invite the bot (Administrator recommended)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/caelondev/TheophilusJS.git
cd TheophilusJS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add your secret keys:

```env
DISCORD_TOKEN=your_bot_token_here
MONGODB_URI=your_mongodb_cluster_uri_here
GROQ_KEY=your_groq_api_key_here
TENOR_KEY=your_tenor_api_key_here
```

### 4. Configure the Bot

Open `config.json` and customize as needed:

```json
{
  "devs": ["your_discord_user_id"],
  "testServers": ["1234567890987654321"]
}
```

> ⚠️ **Important:** Only `config.json` should be modified for runtime configuration. Editing implementation files may break the bot.

### 5. Start the Bot

```bash
node index.js
```

---

## ⚙️ Configuration

### Key Settings

| Setting | Description |
|---------|-------------|
| `DISCORD_TOKEN` | Discord bot token (in `.env`) |
| `MONGODB_URI` | MongoDB connection string (in `.env`) |
| `GROQ_KEY` | Groq API key (in `.env`) |
| `TENOR_KEY` | Tenor API key (in `.env`) |
| `devs` | Array of Discord user IDs with developer/admin privileges |
| `testServers` | Guild IDs for test-only commands |

### Example `config.json`:

```json
{
  "devs": ["123456789012345678"],
  "testServers": ["1234567890987654321"]
}
```

---

## 🎯 Usage

Once your bot is running and invited to your server, you can interact with it using:

- **Slash commands** (`/`) — e.g., `/ping`
- **Secondary prefix** (configured in `config.json`) — TH commands

Admin commands require your Discord ID to be listed in `devs`.

**Check:**
- `src/commands/` for slash commands
- `src/commands-th/` for prefixed (TH) commands

---

## 📁 Project Structure

A simplified view of the repository structure:

```
TheophilusJS/
├─ LICENSE
├─ README.md
├─ .env
├─ config.json
├─ index.js
├─ src/
│  ├─ init.js                      # Starts the bot and executes handlers
│  ├─ handlers/
│  │  └─ handleEvents.js           # Loads files under src/events/
│  ├─ events/
│  │  ├─ clientReady/
│  │  │  └─ 01-registerCommands.js # Register slash commands
│  │  ├─ interactionCreate/
│  │  │  └─ handleCommands.js      # Slash command handler
│  │  ├─ messageCreate/
│  │  │  └─ handleThCommands.js    # Prefixed command handler (TH)
│  │  └─ <eventType>/
│  │     ├─ filter-messages.js
│  │     └─ greet-user.js
│  ├─ commands/                     # Slash commands
│  ├─ commands-th/                  # Prefixed commands
│  ├─ utils/
│  └─ models/
└─ package.json
```

### 📝 Notes:

- `src/handlers/handleEvents.js` is executed by `src/init.js` and scans `src/events/`
- Event folders match Discord event names (e.g., `messageCreate`, `interactionCreate`, `clientReady`)
- Files in `src/events/clientReady/` are sorted; numeric prefixes prioritize execution order

---

## 🎪 Event System Overview

1. `src/init.js` boots the app and calls `src/handlers/handleEvents.js`
2. `handleEvents.js` reads each folder in `src/events/`:
   - Folder name = Discord event (e.g., `messageCreate`)
   - Child files export functions that take `(client, ...args)`
   - Files are executed/registered (order controlled with numeric prefixes)

### Example Event Folder:

```
src/events/messageCreate/
├─ 01-validateMessage.js
├─ 02-handleThCommands.js
└─ 03-logMessages.js
```

This modular approach lets you add new behaviors by dropping files into the appropriate event folder.

---

## 🔧 Command System Overview

There are **two separate command flows**:

### 1️⃣ Slash Commands (`/`)

- **Registration:** `src/events/clientReady/01-registerCommands.js`
- **Runtime handling:** `src/events/interactionCreate/handleCommands.js`
- **Location:** `src/commands/<category>/<command>.js`

### 2️⃣ TH (Custom Prefixed) Commands

- **Runtime handling:** `src/events/messageCreate/handleThCommands.js`
- **Location:** `src/commands-th/<category>/<command>.js`

### Important Shared Behaviors:

- ⏱️ **Cooldown:** Both handlers implement per-user cooldowns
- 🔒 **Ephemeral flags:** Slash handler uses ephemeral replies for errors
- 📍 **Bot channel enforcement:** Both check `BotConfig.channelId`
- 🧪 **Dev/test gating:** `devOnly`, `testOnly`, and `serverSpecific` are respected
- 🔑 **Permissions:** `permissionsRequired` and `botPermissions` are checked
- 🧪 **Beta notifications:** Beta commands show warnings before executing
- 🔞 **NSFW whitelist (TH):** TH handler supports NSFW category gating

---

## Slash Command Workflow

### 1. Write Command File

Create at `src/commands/<category>/<command>.js`

### 2. Handler Process

When an interaction arrives, `src/events/interactionCreate/handleCommands.js`:

1. Matches `interaction.commandName` against local commands
2. Performs checks: cooldowns, botChannel, devOnly, testOnly, permissions
3. Optionally shows beta notification
4. Calls `commandObject.callback(client, interaction)`

---

## Slash Command Example (Annotated)

Create this file at `src/commands/utility/ping.js`:

```javascript
/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = {
  // Basic command meta
  name: "ping",
  description: "Replies with pong and latency info",

  // Optional flags:
  // devOnly: true,         // Only allow users in config.devs
  // testOnly: true,        // Only allow in config.testServers
  // serverSpecific: true,  // Only usable in a guild
  // channelIndependent: false, // Ignore bot channel restrictions
  // beta: true,            // Trigger beta notification before exec

  // Permissions:
  permissionsRequired: [],   // Array of GuildPermissionStrings
  botPermissions: [],        // Permissions the bot needs

  // Cooldown in milliseconds
  cooldown: 3000,

  /**
   * Callback executed by the slash handler
   * @param {import("discord.js").Client} client
   * @param {import("discord.js").Interaction} interaction
   */
  callback: async (client, interaction) => {
    try {
      const latency = Date.now() - interaction.createdTimestamp;
      await interaction.reply({ 
        content: `🏓 Pong! Latency: ${latency}ms` 
      });
    } catch (err) {
      console.error("Error in /ping:", err);
    }
  },
};
```

---

## TH (Custom Prefixed) Command Workflow

### 1. Create Command File

Create at `src/commands-th/<category>/<command>.js`

### 2. Handler Process

The message handler `src/events/messageCreate/handleThCommands.js`:

1. Validates prefix and channel (bot channel / NSFW rules)
2. Parses tokens: category, name, args
3. Loads commands via `loadThCommands`
4. Validates options and required arguments
5. Attaches `.value` to each option object
6. Supports `multiOpt` (merges extra args)
7. Calls `foundCommand.callback(client, message)`

---

## TH Command Example (Annotated)

Create this file at `src/commands-th/fun/say.js`:

```javascript
/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

module.exports = {
  name: "say",
  category: "fun", // Directory: src/commands-th/fun/say.js
  description: "Echoes the provided message.",

  // Handler will attach `.value` to each option
  options: [
    { name: "text", required: true }
  ],

  // Extra tokens combined into { name: "rest", value: [...] }
  // multiOpt: true,

  // Only allow devs listed in config.devs
  // devOnly: true,

  /**
   * @param {import("discord.js").Client} client
   * @param {import("discord.js").Message} message
   */
  callback: async (client, message) => {
    // Access option values injected by handler
    const text = module.exports.options[0].value;

    await message.channel.send(text || "You didn't provide any text!");
  },
};
```

---

## 👨‍💻 Developer Notes & Conventions

- **Author credit:** Keep `Created by caelondev` in project and code headers (required by license)
- **File prefixes:** Use numeric prefixes (e.g., `01-`, `02-`) in `src/events/*` when execution order matters
- **Error handling:** Handlers log errors to console. Consider adding centralized error handler utility
- **Key utilities:**
  - `getConfig`, `getLocalCommands`, `loadThCommands`
  - `chunkMessage`
  - `BotConfig` model, `NSFWUsers` model
- **Cooldowns:** Both command types use `Set` to hold user IDs during cooldown windows
- **Bot channel restrictions:** Uses `BotConfig.channelId` to restrict commands
- **Testing:** Use `testServers` in `config.json` for `testOnly` commands
- **Permissions:** Use `permissionsRequired` (member perms) and `botPermissions` (bot perms)

---

## 🤝 Support & Contributing

If you encounter issues or want to contribute:

1. **[Check Issues](https://github.com/caelondev/TheophilusJS/issues)** — Browse existing issues
2. **Create an Issue** — Report bugs or request features with reproduction steps
3. **Contributions** — Fork the repo, create a branch (`feature/your-thing`), and open a Pull Request

> ⚠️ **Note:** This project is licensed under AGPLv3. Contributions and forks must remain open source under the same license.

---

## 📄 License

This project is licensed under the **[GNU Affero General Public License v3 (AGPLv3)](LICENSE)**.

### Attribution Requirement

All copies, distributions, and substantial portions (including forks and derivative works) must retain the following notice in source files or visible outputs:

> **Created by caelondev**

This README is not a substitute for the full license. See the **[LICENSE](LICENSE)** file for the complete legal text.

---

## 🎖️ Credits

- **Developer:** [caelondev](https://github.com/caelondev)
- **Discord Helper:** ryodc_
- **Framework:** [Discord.js](https://discord.js.org/)

---

<div align="center">
  <strong>Made with ❤️ for the Discord community</strong>
  <br><br>
  <sub>Created by <a href="https://github.com/caelondev">caelondev</a></sub>
</div>
