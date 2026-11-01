const fs = require("fs/promises");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

// Visible AVIF height at the grid's nominal 103px width, including shadows.
// Inspect existing images only; never re-encode or modify the covers.
async function coverHeight(filename) {
  const image = await loadImage(filename);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  for (let y = image.height - 1; y >= 0; y--) {
    for (let x = 0; x < image.width; x++) {
      // AVIFs can have near-transparent residue extending to the canvas edge.
      // Ignore alpha <= 8/255, but keep a 1px gutter for the soft shadow tail.
      if (pixels[(y * image.width + x) * 4 + 3] > 8) {
        return Math.min(
          Math.ceil(image.height * 103 / image.width),
          Math.ceil((y + 1) * 103 / image.width) + 1,
        );
      }
    }
  }
  throw new Error("Empty cover image");
}

async function main() {
  const filename = path.join(__dirname, "books.json");
  const books = JSON.parse(await fs.readFile(filename, "utf8"));
  let extracted = 0;
  let missing = 0;
  for (const book of books) {
    const id = String(book["Book Id"]);
    try {
      if (!/^\d+$/.test(id)) throw new Error("Invalid book ID");
      book["Cover Height"] = await coverHeight(
        path.join(__dirname, "public", "covers", `${id}.avif`),
      );
      extracted++;
    } catch (error) {
      // Keep a full-size slot when a mockup is missing or unreadable.
      book["Cover Height"] = 150;
      missing++;
      console.warn(`Using fallback cover height for ${id}: ${error.message}`);
    }
  }
  const json = JSON.stringify(books, null, 2);
  await fs.writeFile(filename + ".tmp", json + "\n");
  await fs.rename(filename + ".tmp", filename);
  const browserData = path.join(__dirname, "public", "js", "book-data.js");
  await fs.writeFile(browserData + ".tmp", "var books = " + json + ";\n");
  await fs.rename(browserData + ".tmp", browserData);
  console.log(`Extracted ${extracted} cover heights; used ${missing} fallbacks.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
