const fs = require("fs/promises");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const coversDirectory = path.join(__dirname, "public", "covers");
const width = 103;
// Let transparent shadow padding extend into the existing row gutter.
const height = 150;
const resolution = 4;

const settings = {
  thickness: 4,
  viewAngle: 0,
  trimBorder: 0.025, // Maximum fraction trimmed per edge; 0 disables trimming.
  bumpStrength: 0.025,
  shininess: 128,
  reflectiveness: 0.5,
};

function normalize(x, y, z) {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

const light = normalize(-0.5, -0.3, 1);
const halfVector = normalize(light[0], light[1], light[2] + 1);
const linearColors = Float64Array.from({ length: 256 }, (_, index) => {
  const value = index / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
});

function toSrgb(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(
    255 *
      (clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * clamped ** (1 / 2.4) - 0.055),
  );
}

// Shade the printed artwork using cover curvature and subtle paper grain.
function shadeCover(canvas, geometry) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  const { x, y, coverWidth, coverHeight, spineWidth } = geometry;
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;

  const noise = new Float32Array(width * height);
  let seed = 17;
  for (let i = 0; i < noise.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise[i] = (seed / 4294967295 - 0.5) * settings.bumpStrength;
  }
  const heights = new Float32Array(noise.length);
  for (let row = 1; row < height - 1; row++) {
    for (let column = 1; column < width - 1; column++) {
      const i = row * width + column;
      heights[i] =
        (noise[i] * 4 +
          noise[i - 1] +
          noise[i + 1] +
          noise[i - width] +
          noise[i + width]) /
        8;
    }
  }

  const spineRadius = spineWidth * 0.42;
  const hingeRadius = spineWidth * 0.14;
  for (let row = 1; row < height - 1; row++) {
    for (let column = 1; column < width - 1; column++) {
      const i = row * width + column;
      const index = i * 4;
      if (pixels[index + 3] === 0) continue;
      const localX = Math.max(
        0,
        Math.min(coverWidth, (column + 0.5) / resolution - x),
      );
      const localY = Math.max(
        0,
        Math.min(coverHeight, (row + 0.5) / resolution - y),
      );
      const spineDistance = localX - spineWidth * 0.34;
      const hingeDistance = localX - spineWidth;
      const spine = Math.exp(-0.5 * (spineDistance / spineRadius) ** 2);
      const hinge = Math.exp(-0.5 * (hingeDistance / hingeRadius) ** 2);
      const slopeX =
        ((-0.65 * spineDistance) / spineRadius ** 2) * spine +
        ((0.28 * hingeDistance) / hingeRadius ** 2) * hinge +
        0.3 * Math.exp(-localX / 0.4) -
        0.3 * Math.exp(-(coverWidth - localX) / 0.4) +
        ((heights[i + 1] - heights[i - 1]) * resolution) / 2;
      const slopeY =
        0.2 * Math.exp(-localY / 0.4) -
        0.2 * Math.exp(-(coverHeight - localY) / 0.4) +
        ((heights[i + width] - heights[i - width]) * resolution) / 2;
      const normal = normalize(-slopeX, -slopeY, 1);
      const diffuse = Math.max(
        0,
        normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2],
      );
      // Normalize a flat board to 1: don't dim or wash out the entire cover.
      const illumination =
        (0.55 + (0.45 * diffuse) / light[2]) * (1 - 0.1 * hinge);
      const exponent = settings.shininess;
      const reflectiveness = settings.reflectiveness;
      const halfDot = Math.max(
        0,
        normal[0] * halfVector[0] +
          normal[1] * halfVector[1] +
          normal[2] * halfVector[2],
      );
      const specular =
        reflectiveness *
        Math.max(0, halfDot ** exponent - halfVector[2] ** exponent);
      for (let channel = 0; channel < 3; channel++) {
        const diffuseColor = linearColors[pixels[index + channel]];
        // Mostly ink-tinted reflections for matte paper.
        const specularColor = diffuseColor * 0.85 + 0.15;
        pixels[index + channel] = toSrgb(
          diffuseColor * illumination + specularColor * specular,
        );
      }
    }
  }
  context.putImageData(image, 0, 0);
}

// A nearly frontal hardback: the upper edge rises gently toward the fore-edge,
// while the lower edge falls slightly. Keep the curvature small at thumbnail size.
function coverPath(context, x, y, w, h) {
  const radius = Math.min(0.6, w / 10, h / 10);
  context.beginPath();
  context.moveTo(x + radius, y + 0.6);
  context.lineTo(x + w - radius, y);
  context.quadraticCurveTo(x + w, y, x + w, y + radius);
  context.lineTo(x + w - 0.35, y + h + 0.6 - radius);
  context.quadraticCurveTo(
    x + w - 0.35,
    y + h + 0.6,
    x + w - radius - 0.35,
    y + h + 0.6,
  );
  context.lineTo(x + radius - 0.25, y + h - 0.2);
  context.quadraticCurveTo(
    x - 0.25,
    y + h - 0.2,
    x - 0.25,
    y + h - radius - 0.2,
  );
  context.lineTo(x + 0.2, y + radius + 0.6);
  context.quadraticCurveTo(x + 0.2, y + 0.6, x + radius, y + 0.6);
  context.closePath();
}

function drawArtwork(image, geometry) {
  const { x, y, coverWidth, coverHeight } = geometry;
  const canvas = createCanvas(width * resolution, height * resolution);
  const context = canvas.getContext("2d");
  context.scale(resolution, resolution);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  coverPath(context, x, y, coverWidth, coverHeight);
  context.clip();
  // Resample the complete artwork once. Thin strip draws lose letter detail
  // and can introduce seams; the silhouette and lighting provide the shape.
  context.drawImage(image, x, y, coverWidth, coverHeight + 0.6);
  return canvas;
}

function shadowTint(image) {
  // The dominant perimeter color approximates the cover stock/background.
  // Avoid sampling the central illustration or averaging contrasting text.
  const swatch = createCanvas(32, 48);
  const context = swatch.getContext("2d");
  context.drawImage(image, 0, 0, 32, 48);
  const pixels = context.getImageData(0, 0, 32, 48).data;
  const colors = new Map();
  for (let row = 0; row < 48; row++) {
    for (let column = 0; column < 32; column++) {
      if (row >= 3 && row < 45 && column >= 3 && column < 29) continue;
      const i = (row * 32 + column) * 4;
      if (pixels[i + 3] < 128) continue;
      const key = `${pixels[i] >> 5},${pixels[i + 1] >> 5},${pixels[i + 2] >> 5}`;
      const color = colors.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      color.count++;
      color.r += pixels[i];
      color.g += pixels[i + 1];
      color.b += pixels[i + 2];
      colors.set(key, color);
    }
  }
  const dominant = [...colors.values()].sort((a, b) => b.count - a.count)[0];
  const tint = dominant
    ? [dominant.r, dominant.g, dominant.b].map((value) =>
        Math.round((value / dominant.count) * 0.22),
      )
    : [24, 24, 24];
  return (alpha) => `rgba(${tint.join(", ")}, ${alpha})`;
}

function trimCoverBorder(image) {
  const { width, height } = image;
  const limit = Math.floor(
    Math.min(width, height) * Math.max(0, Math.min(0.05, settings.trimBorder)),
  );
  if (!limit) return image;

  const sample = createCanvas(width, height);
  const context = sample.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, (width * height - 1) * 4];
  const background = [0, 1, 2].map((channel) =>
    corners.reduce((sum, index) => sum + pixels[index + channel], 0) / corners.length,
  );
  function matchesBackground(index) {
    return background.every((value, channel) => Math.abs(pixels[index + channel] - value) <= 28);
  }
  if (Math.max(...background) - Math.min(...background) > 18 ||
      !corners.every(matchesBackground)) return image;

  function edgeSize(vertical, reverse) {
    const length = vertical ? height : width;
    const extent = vertical ? width : height;
    const step = Math.max(1, Math.floor(length / 200));
    const boundaries = [];
    let samples = 0;
    function indexAt(depth, along) {
      const position = reverse ? extent - 1 - depth : depth;
      return (vertical ? along * width + position : position * width + along) * 4;
    }
    for (let along = Math.ceil(length * 0.1); along < length * 0.9; along += step) {
      samples++;
      if (!matchesBackground(indexAt(0, along))) continue;
      let strongest = 48;
      let boundary = 0;
      for (let depth = 1; depth <= limit; depth++) {
        // A two-pixel window includes anti-aliased/JPEG fringes around the frame.
        const before = indexAt(depth - 1, along);
        const after = indexAt(depth + 1, along);
        const contrast = Math.max(
          Math.abs(pixels[before] - pixels[after]),
          Math.abs(pixels[before + 1] - pixels[after + 1]),
          Math.abs(pixels[before + 2] - pixels[after + 2]),
        );
        if (contrast > strongest) {
          strongest = contrast;
          boundary = depth;
        }
      }
      if (boundary) boundaries.push(boundary);
    }
    if (!boundaries.length) return 0;
    boundaries.sort((a, b) => a - b);
    const median = boundaries[Math.floor(boundaries.length / 2)];
    const aligned = boundaries.filter((depth) => Math.abs(depth - median) <= 1);
    // Text/illustrations create scattered edges; a frame has one straight boundary.
    if (aligned.length < samples * 0.85) return 0;
    return Math.min(limit, aligned[Math.floor((aligned.length - 1) * 0.9)] + 1);
  }
  const left = edgeSize(true, false);
  const right = edgeSize(true, true);
  const top = edgeSize(false, false);
  const bottom = edgeSize(false, true);
  // A matching dark background or a pair of printed rules is not enough evidence.
  if ([left, right, top, bottom].filter(Boolean).length < 3) return image;

  const cropped = createCanvas(width - left - right, height - top - bottom);
  cropped.getContext("2d").drawImage(
    image, left, top, cropped.width, cropped.height,
    0, 0, cropped.width, cropped.height,
  );
  return cropped;
}

async function renderBookMockup(input) {
  const original = await loadImage(input);
  const image = trimCoverBorder(original);
  if (image !== original) {
    console.log(
      "trimmed border:",
      path.basename(input),
      `${original.width}×${original.height} → ${image.width}×${image.height}`,
    );
  }
  // Match the original cover grid: fixed width, with tall covers capped in height.
  const coverWidth = 93;
  const coverHeight = Math.min(image.height * coverWidth / image.width, 139.5);
  const thickness = settings.thickness;
  const spineWidth = coverWidth * 0.085;
  const x = (width - coverWidth - thickness) / 2;
  const y = 3;
  const geometry = { x, y, coverWidth, coverHeight, spineWidth };
  const shadow = shadowTint(image);
  const canvas = createCanvas(width * resolution, height * resolution);
  const context = canvas.getContext("2d");
  context.scale(resolution, resolution);
  // A more oblique view, applied consistently to the artwork, boards and pages.
  const angle = (settings.viewAngle * Math.PI) / 180;
  const faceScale = Math.cos(angle);
  context.transform(
    faceScale,
    -Math.sin(angle) * 0.11,
    0,
    1,
    (width * (1 - faceScale)) / 2,
    2,
  );
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // Sample the fore-edge, not the whole cover, so the rear board belongs to it.
  const swatch = createCanvas(1, 1);
  const swatchContext = swatch.getContext("2d");
  swatchContext.drawImage(
    image,
    image.width - 1,
    0,
    1,
    image.height,
    0,
    0,
    1,
    1,
  );
  const [r, g, b] = swatchContext.getImageData(0, 0, 1, 1).data;
  const boardColor = `rgb(${Math.round(r * 0.8)}, ${Math.round(g * 0.8)}, ${Math.round(b * 0.8)})`;

  // A restrained cast shadow; retain transparency for both light and dark pages.
  context.save();
  context.shadowColor = shadow(0.19);
  context.shadowBlur = 2 * resolution;
  context.shadowOffsetX = 0.65 * resolution;
  context.shadowOffsetY = 0.8 * resolution;
  context.fillStyle = boardColor;
  coverPath(context, x + thickness, y + 1.1, coverWidth, coverHeight - 1.4);
  context.fill();
  context.restore();

  // Reuse a narrow strip of the actual artwork for the exposed rear-cover edge.
  context.save();
  coverPath(context, x + thickness, y + 1.1, coverWidth, coverHeight - 1.4);
  context.clip();
  context.drawImage(
    image,
    image.width * 0.97,
    0,
    image.width * 0.03,
    image.height,
    x + coverWidth - 1,
    y + 1,
    thickness + 1,
    coverHeight,
  );
  context.fillStyle = "rgba(0, 0, 0, 0.12)";
  context.fillRect(x + coverWidth - 1, y, thickness + 1, coverHeight + 2);
  context.restore();

  // Just a sliver of paper between the boards, with no exaggerated page stripes.
  context.save();
  coverPath(
    context,
    x + thickness * 0.75,
    y + 1.5,
    coverWidth,
    coverHeight - 2.2,
  );
  context.clip();
  const paper = context.createLinearGradient(
    x + coverWidth - 0.4,
    0,
    x + coverWidth + thickness * 0.75,
    0,
  );
  paper.addColorStop(0, "#c7c0ad");
  paper.addColorStop(0.6, "#ede8d9");
  paper.addColorStop(1, "#d4cdba");
  context.fillStyle = paper;
  context.fillRect(x, y, coverWidth + thickness, coverHeight + 2);
  context.restore();

  // A tight contact shadow separates the front board from the recessed rear edge.
  context.save();
  context.shadowColor = shadow(0.24);
  context.shadowBlur = 0.55 * resolution;
  context.shadowOffsetX = 0.5 * resolution;
  context.shadowOffsetY = 0.25 * resolution;
  context.fillStyle = boardColor;
  coverPath(context, x, y, coverWidth, coverHeight);
  context.fill();
  context.restore();

  // Shade only the artwork layer; leave cast shadows and the rear board alone.
  const front = drawArtwork(image, geometry);
  shadeCover(front, geometry);
  context.drawImage(front, 0, 0, width, height);

  return canvas.encode("webp", 100);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const ids = args.filter((arg) => arg !== "--force");
  if (ids.some((id) => !/^\d+$/.test(id))) {
    throw new Error(
      "Usage: node generate-book-mockups.js [--force] [book-id ...]",
    );
  }

  // Without IDs, backfill every downloaded JPG; no browser or network needed.
  const files = ids.length
    ? [...new Set(ids)].map((id) => `${id}.jpg`)
    : (await fs.readdir(coversDirectory))
        .filter((file) => /^\d+\.jpg$/.test(file))
        .sort();
  const scriptTime = (await fs.stat(__filename)).mtimeMs;
  let generated = 0;
  let skipped = 0;
  for (const file of files) {
    const input = path.join(coversDirectory, file);
    const output = input.replace(/\.jpg$/, ".webp");
    try {
      const sourceTime = (await fs.stat(input)).mtimeMs;
      const existing = await fs.stat(output).catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      });
      if (
        !force &&
        existing &&
        existing.mtimeMs >= Math.max(sourceTime, scriptTime)
      ) {
        skipped++;
        continue;
      }
      const buffer = await renderBookMockup(input);
      await fs.writeFile(output + ".tmp", buffer);
      await fs.rename(output + ".tmp", output);
      generated++;
      console.log("saved mockup:", path.basename(output));
    } catch (error) {
      process.exitCode = 1;
      console.error("error rendering:", file, error.message);
    }
  }
  console.log(
    `Generated ${generated} mockups; skipped ${skipped} up-to-date files.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
