const http = require("http");

// change this to the allocation port shown in your Bot-Hosting panel
const PORT = 21200;  

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is alive!\n");
}).listen(PORT, () => {
  console.log(`Ping server running on port ${PORT}`);
});