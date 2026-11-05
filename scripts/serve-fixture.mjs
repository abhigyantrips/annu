import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const page = readFileSync("tests/fixtures/tracker.html");
const server = createServer((_req, res) => {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(page);
});
server.listen(3100, "127.0.0.1", () =>
  console.log("Tracker fixture: http://localhost:3100/?site=SITE_UUID"),
);
