/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const fs = require("fs");

module.exports = (path, isFolder = false) => {
  if (!fs.existsSync(path)) return false;

  const stats = fs.lstatSync(path);

  if (isFolder) {
    return stats.isDirectory();
  } else {
    return stats.isFile();
  }
};
