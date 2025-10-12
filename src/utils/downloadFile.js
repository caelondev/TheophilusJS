const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async (url, img_path) => {
  let img_name = url.split("/").pop();

  if (!img_path) {
    if (!img_name.endsWith(".png")) img_name += ".png";
    img_path = path.join(__dirname, "..", "cache", img_name);
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    await fs.promises.writeFile(img_path, response.data);
    return img_path;
  } catch (err) {
    try {
      if (await fs.promises.stat(img_path)) {
        await fs.promises.unlink(img_path);
      }
    } catch (_) {}
    throw err;
  }
};
