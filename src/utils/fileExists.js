const fs = require("fs").promises;
const { constants } = require("fs");

module.exports = async (filePath) => {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};
