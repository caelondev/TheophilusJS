/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async (url, img_path) => {
  let img_name = url.split("/").pop();

  if (!img_path) {
    img_path = path.join(__dirname, "..", "cache", img_name);
  }

  await fs.promises.mkdir(path.dirname(img_path), { recursive: true });

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    await fs.promises.writeFile(img_path, response.data);
    return img_path;
  } catch (err) {
    await fs.promises.unlink(img_path).catch(() => {});
    throw err;
  }
};
