const fs = require("fs");
const fsp = fs.promises;
const readline = require("readline");
const path = require("path");
const getAllFiles = require("../utils/getAllFiles");
const toCamelCase = require("../utils/toCamelCase");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = (q) => new Promise((res) => rl.question(q, res));
const getName = (file) => file.replace(/\\/g, "/").split("/").pop();

const loadTemplate = async () => {
  const templatePath = path.resolve(
    __dirname,
    `../../template/commands/commands-template.js`,
  );
  return await fsp.readFile(templatePath, "utf8");
};

const createFile = async (filePath, ...fileNames) => {
  for (const f of fileNames) {
    const fileLocation = path.join(filePath, f);
    const fileName = getName(f);
    await fsp.mkdir(path.dirname(fileLocation), { recursive: true });
    await fsp.writeFile(fileLocation, "");
    console.log(`Created ${fileName}`);
    await fillCommandTemplate(fileLocation, fileName);
  }
};

const normalizeBoolString = (input) => {
  if (!input) return "false";
  const v = input.trim().toLowerCase();
  return v === "y" || v === "yes" || v === "true" || v === "t"
    ? "true"
    : "false";
};

const sanitizeForCallback = (filename) => {
  const base = filename.replace(/\.[^/.]+$/, "");
  const cleaned = base.replace(/[^0-9A-Za-z]+/g, " ").trim();
  return cleaned;
};

const fillCommandTemplate = async (filePath, fileName) => {
  let commandNameInput = "";
  let description = "";
  let onlyWorkOnServers = "";
  let canWorkEvenIfNotBotChannel = "";

  while (!commandNameInput)
    commandNameInput = (await ask("Enter command name: ")).trim();
  while (!description)
    description = (await ask("Enter command description: ")).trim();
  while (!onlyWorkOnServers)
    onlyWorkOnServers = (
      await ask("Should it only work on servers? (true/false): ")
    ).trim();
  while (!canWorkEvenIfNotBotChannel)
    canWorkEvenIfNotBotChannel = (
      await ask("Should it work even if not bot channel? (true/false): ")
    ).trim();

  const onlyWorkOnServersNormalized = normalizeBoolString(onlyWorkOnServers);
  const canWorkEvenIfNotBotChannelNormalized = normalizeBoolString(
    canWorkEvenIfNotBotChannel,
  );
  const callbackName = toCamelCase(`handle ${sanitizeForCallback(fileName)}`);
  const template = await loadTemplate();

  const filledTemplate = template
    .replace(/\bcommandName\b/g, callbackName)
    .replace(/\bnamePlaceholder\b/g, `"${commandNameInput}"`)
    .replace(/\bdesc\b/g, `"${description.replace(/"/g, '\\"')}"`)
    .replace(/\bonlyWorkOnServers\b/g, onlyWorkOnServersNormalized)
    .replace(
      /\bcanWorkEvenIfNotBotChannel\b/g,
      canWorkEvenIfNotBotChannelNormalized,
    );

  await fsp.writeFile(filePath, filledTemplate, "utf8");
  console.log(`Filled template for ${fileName} with callback: ${callbackName}`);
};

const getFormattedDirectoryList = (files, filePath) => {
  let result = "";
  const normalizedPath =
    filePath.replace(/\\/g, "/").replace(/^.+\//, "") + "/";
  const directory = [normalizedPath, ...files];
  for (const [i, file] of directory.entries()) {
    const normalizedFile = file.replace(/\\/g, "/").split("/").pop();
    if (i === 0) result += normalizedFile + "\n";
    else if (i === directory.length - 1) result += `└── ${normalizedFile}\n`;
    else result += `├── ${normalizedFile}\n`;
  }
  return result;
};

const createNewCategory = async (categoryPath) => {
  if (fs.existsSync(categoryPath))
    throw new Error("This category already exists!");
  await fsp.mkdir(categoryPath, { recursive: true });
  console.log(`Category created: ${getName(categoryPath)}`);
};

const lookForFiles = async (categoryPath, filename) => {
  const fullPath = path.join(categoryPath, filename);
  if (filename.endsWith("/")) {
    await createNewCategory(fullPath);
    return;
  }
  if (!fs.existsSync(categoryPath))
    throw new Error(`Cannot find category ${getName(categoryPath)}.`);
  if (fs.existsSync(fullPath)) throw new Error("This file already exists!");
  await createFile(categoryPath, filename);
};

const initialize = async () => {
  console.log("=== COMMAND CREATOR ===");
  const COMMANDS_PATH = path.resolve(__dirname, "../commands");
  const formattedDirectoryList = getFormattedDirectoryList(
    getAllFiles(COMMANDS_PATH, true),
    COMMANDS_PATH,
  );
  console.log(formattedDirectoryList);

  let category = "",
    filename = "";
  do {
    category = (
      await ask(
        "Enter your new file's category\n(end with '/' if creating a directory): ",
      )
    ).trim();
    filename = (await ask("Enter your new file's name: ")).trim();
  } while (!category || !filename);

  await lookForFiles(path.join(COMMANDS_PATH, category), filename);
  rl.close();
};

initialize();
