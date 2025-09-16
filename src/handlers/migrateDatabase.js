const mongoose = require("mongoose");
const path = require("path");
const getAllFiles = require("../utils/getAllFiles");

const autoMigrator = async () => {
  try {
    console.log("🔄 Starting database auto-migration...");

    // Get all model files
    const modelsPath = path.join(__dirname, "../models");
    const modelFiles = getAllFiles(modelsPath);

    console.log(`📁 Found ${modelFiles.length} model files`);

    for (const modelFile of modelFiles) {
      try {
        // Import the model
        const Model = require(modelFile);
        const modelName = Model.modelName;
        const collectionName = Model.collection.name;

        console.log(
          `🔍 Processing model: ${modelName} (collection: ${collectionName})`,
        );

        // Get schema definition
        const schema = Model.schema;
        const schemaPaths = schema.paths;

        // Get all documents in the collection
        const documents = await Model.find({}).lean();

        if (documents.length === 0) {
          console.log(
            `⚠️  No documents found in ${collectionName}, skipping...`,
          );
          continue;
        }

        let updatedCount = 0;
        const missingFieldsSet = new Set();

        for (const doc of documents) {
          const updateFields = {};
          let hasUpdates = false;

          // Check each schema path for missing fields
          for (const [fieldPath, schemaType] of Object.entries(schemaPaths)) {
            // Skip internal mongoose fields
            if (fieldPath === "_id" || fieldPath === "__v") continue;

            // Check if field exists in document
            if (!(fieldPath in doc)) {
              // Get default value from schema
              const defaultValue = schemaType.defaultValue;

              if (defaultValue !== undefined) {
                updateFields[fieldPath] =
                  typeof defaultValue === "function"
                    ? defaultValue()
                    : defaultValue;
                hasUpdates = true;
                missingFieldsSet.add(fieldPath);
              } else if (
                schemaType.options &&
                schemaType.options.default !== undefined
              ) {
                const defVal = schemaType.options.default;
                updateFields[fieldPath] =
                  typeof defVal === "function" ? defVal() : defVal;
                hasUpdates = true;
                missingFieldsSet.add(fieldPath);
              }
            }
          }

          // Update document if there are missing fields
          if (hasUpdates) {
            await Model.updateOne({ _id: doc._id }, { $set: updateFields });
            updatedCount++;
          }
        }

        if (updatedCount > 0) {
          const missingFields = Array.from(missingFieldsSet).join(", ");
          console.log(
            `✏️  Found missing fields (${missingFields}) in ${collectionName}`,
          );
          console.log(
            `✅ Updated ${updatedCount} documents in ${collectionName}`,
          );
        } else {
          console.log(`✅ All documents in ${collectionName} are up to date`);
        }
      } catch (modelError) {
        console.error(
          `❌ Error processing model file ${modelFile}:`,
          modelError.message,
        );
      }
    }

    console.log("🎉 Database auto-migration completed!");
  } catch (error) {
    console.error("❌ Auto-migration failed:", error.message);
    throw error;
  }
};

module.exports = autoMigrator;
