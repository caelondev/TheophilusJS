const path = require("path");
const isFileExisting = require("./isFileExisting");

let initialized = false;

module.exports = () => {
  const configPath = path.resolve(__dirname, "../../config.json");
  const devConfigPath = path.resolve(__dirname, "../../devConfig.json"); // absolute path

  let outputMessage = "";
  let usedConfig = configPath;

  if (!initialized) {
    if (!isFileExisting(devConfigPath)) {
      console.log(
        "⚠️ 'devConfig.json' not found! Using 'config.json' instead. ✅",
      );
      outputMessage = "✅ Config loaded successfully from 'config.json'!";
    } else {
      console.log(
        "✅ 'devConfig.json' found! Prioritizing devConfig over 'config.json'. 🛠️",
      );
      outputMessage =
        "✅ Config loaded successfully from 'devConfig.json'! (Dev mode)";
      usedConfig = devConfigPath;
    }

    console.log(outputMessage);
    initialized = true
  }
  return require(usedConfig);
};
