const path = require("path");
const fs = require("fs");
const sanitize = require("./configSanitizer"); // import your sanitizer
const drawLine = require("./drawLine");

const devConfigPath = path.resolve(__dirname, "../../devConfig.json");
const configPath = path.resolve(__dirname, "../../config.json");

// Define which fields should be sanitized in config.json
const cleanedValues = {
  botClientId: "",
  testServers: [],
  devs: [],
};

module.exports = () => {
  if (!fs.existsSync(devConfigPath)) {
    if (!fs.existsSync(configPath)) {
      console.log("⚠️ 'config.json' not found! Exiting. ❌");
      process.exit(1);
    }
    return;
  }

  console.log(
    "🔍 'devConfig.json' found! Scanning both 'devConfig.json' and 'config.json' for differences. 🛠️",
  );
  drawLine();

  const devConfigObj = JSON.parse(fs.readFileSync(devConfigPath, "utf8"));

  let configObj = {};
  if (fs.existsSync(configPath)) {
    configObj = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    console.log(
      "⚠️ 'config.json' not found! Creating a new one from 'devConfig.json'. 🛠️",
    );
    drawLine();
  }

  // Check if devConfig and config are identical
  if (JSON.stringify(devConfigObj) === JSON.stringify(configObj)) {
    console.log(
      "ℹ️ Nothing to build! 'config.json' is already up-to-date. Returning. ✅",
    );
    drawLine();
  } else {
    // Write devConfig to config.json
    fs.writeFileSync(configPath, JSON.stringify(devConfigObj, null, 2));
    console.log(
      "✅ 'config.json' has been successfully updated from 'devConfig.json'! 📝",
    );
    drawLine();
  }

  // Now sanitize the config.json based on cleanedValues
  console.log("🧹 Sanitizing sensitive fields in 'config.json'... 🛠️");
  sanitize(configPath, cleanedValues);
  drawLine();
  console.log("✨ Sanitization complete. 'config.json' is ready. ✅");
};
