/**
 * Created by caelondev
 * Licensed under the GNU AGPLv3
 * See LICENSE for details.
 */

const http = require("http");

const PORT = 21200;  

module.exports = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is alive!\n");
}).listen(PORT, () => {
  console.log(`Ping server running on port ${PORT}`);
});
