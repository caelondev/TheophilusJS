# TheophilusJS

A feature-rich Discord bot built with Discord.js, designed for seamless deployment and ease of use. TheophilusJS provides essential utility commands while maintaining a simple configuration system that allows users to customize their bot instance through a single configuration file.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)](https://discord.js.org/)

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [Support](#support)
- [License](#license)
- [Credits](#credits)

---

## Features

✅ **Ready-to-Deploy** - Fully functional Discord bot with minimal setup required  
✅ **Simple Configuration** - Customize your bot through a single `config.json` file  
✅ Integrated with MongoDB - Store your users' info automatically
✅ **Command System** - Comprehensive command handler with admin controls  
✅ **Event Handling** - Built-in Discord event management  
✅ **Beginner Friendly** - Easy setup process with clear documentation    
✅ **Stable & Reliable** - Built on Discord.js v14 for optimal performance

---

## Prerequisites

Before installing TheophilusJS, ensure you have the following:

- **[Node.js](https://nodejs.org/)** v18.0.0 or higher
- **[npm](https://www.npmjs.com/get-npm)** package manager (included with Node.js)
- **Discord Bot Token** - [Create a bot application](https://discord.com/developers/applications)
- Groq API Key - Used for AI logic. Get your key [here](https://console.groq.com)
- MongoDB Cluster - Create your cluster [here](cloud.mongodb.com)
- **Discord Server** with appropriate permissions to invite your bot (Administrator permission is recommended)

---

## Installation

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
Open `config.json` and customize the settings according to your preferences:
```json
{
  "devs": ["your_discord_user_id"], "NOTE": "devs are refered to as the bot admin(s)",
  "other_settings": "configure_as_needed"
}
```

### 5. Start the Bot
```bash
node index.js
```

🎉 **Success!** Your bot should now be online and ready to use in your Discord server.

---

## Configuration

> ⚠️ **Important Notice**: Only the `config.json` file should be modified. Editing other files may cause the bot to malfunction or break entirely.

### Configurable Settings

| Setting | Description | Example |
|---------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token (stored in `.env`) | `1234567890987654321` |
| `MONGODB_URI` | Your MongoDB cluster (stored in `.env`) | `MONGODB_URI="mongodb://username:password@host:port/database"`
| `GROQ_KEY` | Your Groq key (stored in `.env`) | N/A |
| `TENOR_KEY` | Your Tenor API key (stored in `.env`) | N/A
| `devs` | Array of Discord user IDs with admin privileges | `["123456789012345678", "098765432123456789"]` |

### Example Configuration
```json
{
  "devs": [
    "123456789012345678",
    "987654321098765432"
  ],
  "testServers": [
    "1234567890987654321"
  ]
}
```

---

## Usage

Once your bot is running and invited to your server, you can interact with it using the prefix `/`

### Basic Commands
- Use `/ping` to ping and check TheophilusJS' latency
- Admin commands require your Discord ID to be listed in the `devs` array
- Check the `src/commands/` directory for a complete list of available commands

---

## Commands

All bot commands are organized in the `src/commands/` directory. The bot features a modular command system that supports:

- **Utility Commands** - General-purpose bot functionality
- **Admin Commands** - Server management and configuration
- **Fun Commands** - Entertainment and interactive features

---

## Support

If you encounter any issues or need assistance:

1. **Check the Issues** - Browse existing [GitHub Issues](https://github.com/caelondev/TheophilusJS/issues)
2. **Create an Issue** - Report bugs or request features
3. **Documentation** - Review this README and inline code comments

---

## License

**Copyright © 2025 caelondev. All rights reserved.**

This software is provided for personal and educational use only. You are permitted to:
- ✅ Use the software for personal projects
- ✅ Modify the `config.json` file for customization
- ✅ Deploy your own instance of the bot

You are **NOT** permitted to:
- ❌ Modify any files other than `config.json`
- ❌ Distribute modified versions of the software
- ❌ Create derivative works without explicit permission
- ❌ Use for commercial purposes

---

## Credits

**Developer**: [caelondev](https://github.com/caelondev)  

**Discord**: [ryodc_](https://discord.com/users/1264839050427367570)

**Framework**: [Discord.js](https://discord.js.org/)  

---

<div align="center">
  <strong>Made with ❤️ for the Discord community</strong>
</div>
