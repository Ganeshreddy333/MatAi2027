"use strict";

const fs = require("fs/promises");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const storage = require("./storage");

async function setup() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
    throw new Error("Configure MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE in the project .env file first.");
  }
  const contentFile = path.join(__dirname, "data", "content.json");
  let content = {};
  try {
    content = JSON.parse(await fs.readFile(contentFile, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const mode = await storage.initialize(content);
  if (mode !== "mysql") throw new Error("MySQL storage was not enabled.");
  console.log("MySQL tables are ready. Existing JSON data was imported once if this database was new.");
}

setup()
  .catch((err) => {
    console.error("Could not set up MySQL:", err);
    process.exitCode = 1;
  })
  .finally(() => storage.close());
