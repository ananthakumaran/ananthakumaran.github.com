const fs = require("fs/promises");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const directory = __dirname;
const fallbackColor = "#75695b";

function hex(channels) {
  return "#" + channels.map(channel => Math.round(channel).toString(16).padStart(2, "0")).join("");
}

function rgb(color) {
  return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
}

function luminance(channels) {
  const linear = channels.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(channels, background) {
  const foreground = luminance(channels);
  return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
}

function contrastTarget(background) {
  // Fixed mid-tone backgrounds cannot always support 7:1, even with black/white.
  return Math.min(7, Math.max(contrast([0, 0, 0], background), contrast([255, 255, 255], background)));
}

function readableInk(channels, background) {
  const target = contrastTarget(background);
  if (contrast(channels, background) >= target) return hex(channels);
  // First brighten by scaling RGB together: red stays red instead of turning pink.
  // Only reduce saturation if the brightest version still cannot meet contrast.
  const endpoint = contrast([0, 0, 0], background) >= contrast([255, 255, 255], background) ? 0 : 255;
  let start = channels;
  const maximum = Math.max(...channels);
  if (endpoint === 255 && maximum > 0) {
    const gain = 255 / maximum;
    for (let step = 1; step <= 100; step++) {
      const adjusted = channels.map(channel => Math.round(channel * (1 + (gain - 1) * step / 100)));
      if (contrast(adjusted, background) >= target) return hex(adjusted);
    }
    start = channels.map(channel => Math.round(channel * gain));
  }
  for (let step = 1; step <= 100; step++) {
    const adjusted = start.map(channel => Math.round(channel + (endpoint - channel) * step / 100));
    if (contrast(adjusted, background) >= target) return hex(adjusted);
  }
  return hex([endpoint, endpoint, endpoint]);
}

function palette(pixels, width, height, inset = false) {
  const histogram = new Map();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Favor the title area; exclude cover borders and bottom publisher marks.
      if (inset && (x < width * 0.08 || x >= width * 0.92 || y < height * 0.05 || y >= height * 0.85)) continue;
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 128) continue;
      const key = `${pixels[i] >> 5},${pixels[i + 1] >> 5},${pixels[i + 2] >> 5}`;
      const bin = histogram.get(key) || { count: 0, channels: [0, 0, 0] };
      bin.count++;
      for (let channel = 0; channel < 3; channel++) bin.channels[channel] += pixels[i + channel];
      histogram.set(key, bin);
    }
  }
  return [...histogram.values()].map(bin => ({
    count: bin.count,
    channels: bin.channels.map(sum => Math.round(sum / bin.count)),
  })).sort((a, b) => b.count - a.count);
}

function coverInk(image, background) {
  const canvas = createCanvas(96, 144);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const colors = palette(pixels, canvas.width, canvas.height, true);
  if (!colors.length) throw new Error("No opaque cover pixels");
  const lightness = luminance(rgb(background));
  const candidates = colors.filter(color => color.count >= 8);
  const total = colors.reduce((sum, color) => sum + color.count, 0);
  function saturation(color) {
    const maximum = Math.max(...color.channels);
    return maximum ? (maximum - Math.min(...color.channels)) / maximum : 0;
  }
  // Select the cover's accent before enforcing text contrast. Otherwise even a
  // strong red area can lose to a small white author credit or publisher mark.
  const accents = candidates.filter(color =>
    color.count >= Math.max(16, total * 0.01) &&
    Math.max(...color.channels) - Math.min(...color.channels) >= 40 &&
    saturation(color) >= 0.35 && contrast(color.channels, lightness) >= 1.5,
  );
  const readable = candidates.filter(color => contrast(color.channels, lightness) >= contrastTarget(lightness));
  function score(color) {
    if (accents.length) {
      return Math.sqrt(color.count) * (0.5 + saturation(color)) *
        Math.min(contrast(color.channels, lightness), 4.5);
    }
    return Math.sqrt(color.count) * Math.min(contrast(color.channels, lightness), 9);
  }
  const pool = accents.length ? accents : readable.length ? readable : candidates.length ? candidates : colors;
  const ranked = pool.sort((a, b) => score(b) - score(a));
  return readableInk(ranked[0].channels, lightness);
}

async function spineColors(filename) {
  const image = await loadImage(filename);
  const canvas = createCanvas(12, 96);
  const context = canvas.getContext("2d");
  // Preserve the existing background extraction from the left cover strip.
  const stripWidth = Math.max(1, image.width * 0.12);
  context.drawImage(image, image.width * 0.01, image.height * 0.07,
    stripWidth, image.height * 0.86, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const dominant = palette(pixels, canvas.width, canvas.height)[0];
  if (!dominant) throw new Error("No opaque cover pixels");
  const background = hex(dominant.channels);
  return { background, text: coverInk(image, background) };
}

async function main() {
  const filename = path.join(directory, "books.json");
  const books = JSON.parse(await fs.readFile(filename, "utf8"));
  let extracted = 0;
  let missing = 0;
  for (const book of books) {
    try {
      const id = String(book["Book Id"]);
      if (!/^\d+$/.test(id)) throw new Error("Invalid book ID");
      const colors = await spineColors(path.join(directory, "public", "covers", `${id}.jpg`));
      book["Spine Color"] = colors.background;
      book["Spine Text Color"] = colors.text;
      extracted++;
    } catch (error) {
      // A missing/bad thumbnail must not prevent the timeline from rendering.
      if (!/^#[\da-f]{6}$/i.test(book["Spine Color"] || "")) {
        book["Spine Color"] = fallbackColor;
      }
      const ink = /^#[\da-f]{6}$/i.test(book["Spine Text Color"] || "")
        ? book["Spine Text Color"] : book["Spine Color"];
      book["Spine Text Color"] = readableInk(rgb(ink), luminance(rgb(book["Spine Color"])));
      missing++;
      console.warn(`Using fallback spine color for ${book["Book Id"]}: ${error.message}`);
    }
  }
  const json = JSON.stringify(books, null, 2);
  await fs.writeFile(filename + ".tmp", json + "\n");
  await fs.rename(filename + ".tmp", filename);
  const browserData = path.join(directory, "public", "js", "book-data.js");
  await fs.writeFile(browserData + ".tmp", "var books = " + json + ";\n");
  await fs.rename(browserData + ".tmp", browserData);
  console.log(`Extracted ${extracted} spine background/text color pairs; used ${missing} fallbacks.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
