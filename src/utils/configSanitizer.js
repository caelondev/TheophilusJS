const fs = require("fs");
const path = require("path");

function sanitize(filePath, cleanPattern) {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    console.log(`⚠️ File '${filePath}' not found! Exiting. ❌`);
    return;
  }

  let fileData;
  try {
    fileData = JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch (err) {
    console.error(`❌ Failed to read or parse '${filePath}':`, err);
    return;
  }

  let changed = false;

  // Iterate through keys in cleanPattern
  for (const key of Object.keys(cleanPattern)) {
    const patternValue = cleanPattern[key];

    if (!(key in fileData)) {
      // Key missing → append it
      fileData[key] = patternValue;
      console.log(`⚠️ Key '${key}' not found in file, adding it with sanitized value:`, patternValue);
      changed = true;
      continue;
    }

    const fileValue = fileData[key];

    // Check if value differs
    const isDifferent =
      typeof patternValue === "object" && patternValue !== null
        ? JSON.stringify(patternValue) !== JSON.stringify(fileValue)
        : patternValue !== fileValue;

    if (isDifferent) {
      fileData[key] = patternValue;
      console.log(`🧹 Sanitized key '${key}':`, fileValue, "->", patternValue);
      changed = true;
    }
  }

  if (!changed) {
    console.log("🧼 Already sanitized. No changes needed. ✅");
    return;
  }

  // Write back sanitized file
  fs.writeFileSync(absPath, JSON.stringify(fileData, null, 2));
  console.log("✨ Sanitization complete. Changes saved. ✅");
}

module.exports = sanitize;
