import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
process.stdout.write("Choose a password (at least 12 characters; input hidden): ");
rl.question("", (password) => {
  rl.close(); process.stdout.write("\n");
  if (password.length < 12 || password.length > 256) { console.error("Use 12–256 characters."); process.exitCode = 1; return; }
  const salt = randomBytes(16).toString("hex");
  console.log("Save this as BOARDO_PASSWORD_HASH in your private environment:");
  console.log(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
});
