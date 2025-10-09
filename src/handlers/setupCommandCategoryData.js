const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const getAllFiles = require("../utils/getAllFiles");

const COMMANDS_PATH = path.join(__dirname, "..", "commands");

const mergeWithTemplate = (current, template)=>{
  for (const key in template) {
    if (!(key in current) || current[key] === "" || current[key] === null || current[key] === undefined) {
      current[key] = template[key];
    } else if (typeof template[key] === "object" && !Array.isArray(template[key])) {
      current[key] = mergeWithTemplate(current[key], template[key]);
    }
  }
  return current;
};

const main = async () => {
  try {
    const allCategories = getAllFiles(COMMANDS_PATH, true);
    const templatePath = path.join(__dirname, "..", "..", "template", "directory", "category-config.json");
    const templateRaw = await fsp.readFile(templatePath, "utf8");
    const template = JSON.parse(templateRaw);

    for (const category of allCategories) {
      const configPath = path.join(category, "config.json");

      let configExists = true;
      try {
        await fsp.access(configPath, fs.constants.F_OK);
      } catch {
        configExists = false;
      }

      if (!configExists) {
        await fsp.writeFile(configPath, JSON.stringify(template, null, 2), "utf8");
      } else {
        const existingRaw = await fsp.readFile(configPath, "utf8");
        const existingConfig = JSON.parse(existingRaw);
        const mergedConfig = mergeWithTemplate(existingConfig, template);
        await fsp.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), "utf8");
      }
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  main
};
