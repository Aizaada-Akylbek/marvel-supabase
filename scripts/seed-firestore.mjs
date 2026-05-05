import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const serviceAccountPath = getArgValue("--service-account");
const collectionName = getArgValue("--collection") || "marvels";
const sourcePath =
  getArgValue("--source") ||
  path.resolve(__dirname, "../../marvel-json/characters.json");
const shouldDeleteFirst = hasFlag("--delete-first");

if (!serviceAccountPath) {
  console.error("Missing --service-account path.");
  process.exit(1);
}

const absoluteServiceAccountPath = path.resolve(serviceAccountPath);
const serviceAccount = JSON.parse(
  fs.readFileSync(absoluteServiceAccountPath, "utf8")
);

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const records = Array.isArray(source)
  ? source
  : Array.isArray(source.characters)
    ? source.characters
    : [];

if (records.length === 0) {
  console.error("No records found to seed.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function deleteCollection() {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) return;

  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount += 1;
    if (batchCount === 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}

async function seed() {
  if (shouldDeleteFirst) {
    await deleteCollection();
  }

  let batch = db.batch();
  let batchCount = 0;
  let total = 0;

  for (const record of records) {
    const docId = record.id ?? record.name;
    if (!docId) continue;

    const docRef = db.collection(collectionName).doc(String(docId));
    batch.set(docRef, record, { merge: true });
    batchCount += 1;
    total += 1;

    if (batchCount === 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Seeded ${total} records into ${collectionName}.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
