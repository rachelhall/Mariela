// generate-album-json.cjs
// -------------------------------------------
// Usage:
//   1. Set your .env Cloudinary credentials
//   2. Edit FOLDER_PATH, ALBUM_NAME, ARTIST_NAME, COVER_ART_URL, defaults
//   3. node generate-album-json.cjs
//   4. Output: album.json in this directory
// -------------------------------------------

require("dotenv").config();
const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");

// ---- Cloudinary config ----
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---- CONFIG: customize these for each album ----
const FOLDER_PATH = "44k24"; // change to your album folder

const ALBUM_NAME = "The Underglow";
const ARTIST_NAME = "Mariela";
const COVER_ART_URL =
  "https://res.cloudinary.com/dyspjkmgs/image/upload/v1234567890/mariela/the-underglow/cover.jpg";

// Default metadata for every track (can override per-track below)
const DEFAULT_PRODUCER = "Tommy E. Nixon";
const DEFAULT_WRITER = "Rachel Hall";
const DEFAULT_CREDITS = [
  "Written by Rachel Hall",
  "Produced by Tommy E. Nixon",
];

// Optional per-track overrides keyed by the last segment of public_id
// e.g. "01_santa_ana"
const TRACK_METADATA_OVERRIDES = {
  // "01_santa_ana": {
  //   producer: "Someone Else",
  //   writer: "Someone Else",
  //   credits: ["Written by Someone Else", "Produced by Someone Else"],
  // },
};

// ---------- helpers ----------

// e.g. "mariela/the-underglow/01_Fall_In_Love_Again_MASTER_44k24_b3m8sn" -> "01_Fall_In_Love_Again_MASTER_44k24_b3m8sn"
function getBaseNameFromPublicId(publicId) {
  const parts = publicId.split("/");
  const last = parts[parts.length - 1];
  return last.replace(/\.[^/.]+$/, ""); // strip extension
}

// e.g. "01_Fall_In_Love_Again_MASTER_44k24_b3m8sn" -> 1
function getTrackNumberFromBaseName(baseName) {
  const match = baseName.match(/^(\d+)/); // leading digits
  if (!match) return null;
  return Number(match[1]);
}

// Strip track number + technical suffixes (MASTER, sample rate, hash, REV, etc.)
function getCoreName(baseName) {
  // Strip leading track number & separator
  let name = baseName.replace(/^\d+[\s._-]*/, "");

  // Strip everything from "_MASTER" onward (covers MASTER_44k24, MASTER_48k, etc.)
  name = name.replace(/_MASTER.*$/i, "");

  // Strip generic mix/revision suffixes if they exist (e.g. _MIX, _REV01)
  name = name.replace(/_(MIX|MSTR|REV).*$/i, "");

  // If there's still a trailing random hash-like chunk (must contain a digit), remove it
  // e.g. "_b3m8sn" will be removed, but "_Again" / "_Summer" will NOT
  name = name.replace(/_[A-Za-z0-9]*\d[A-Za-z0-9]*$/, "");

  // Final cleanup: trim stray separators
  name = name.replace(/[_\s-]+$/, "");

  return name;
}

// e.g. baseName "01_Fall_In_Love_Again_MASTER_44k24_b3m8sn" -> "Fall In Love Again"
function titleFromBaseName(baseName) {
  const core = getCoreName(baseName);

  const spaced = core.replace(/[_-]+/g, " ");

  let title = spaced
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Fix common contractions from filename-safe forms
  title = title.replace(/\bDon T\b/gi, "Don't").replace(/\bCan T\b/gi, "Can't");

  return title;
}

// e.g. baseName "01_Fall_In_Love_Again_MASTER_44k24_b3m8sn" -> "fall-in-love-again"
function slugFromBaseName(baseName) {
  const core = getCoreName(baseName);
  return core
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTrackOverrides(resource) {
  const baseName = getBaseNameFromPublicId(resource.public_id);
  return TRACK_METADATA_OVERRIDES[baseName] || {};
}

// ---- main: fetch all resources in folder & build JSON ----
async function getAllTracksInFolder(folderPath) {
  const tracks = [];
  let nextCursor = null;

  console.log(`Fetching tracks from folder: "${folderPath}"`);

  do {
    const res = await cloudinary.search
      .expression(`folder="${folderPath}"`)
      .max_results(500)
      .execute();

    res.resources.forEach((r) => {
      // Cloudinary audio often uses resource_type: "video"
      if (!["video"].includes(r.resource_type)) return;

      const baseName = getBaseNameFromPublicId(r.public_id);
      const trackNumber = getTrackNumberFromBaseName(baseName);
      const title = titleFromBaseName(baseName);
      const slug = slugFromBaseName(baseName);
      const overrides = getTrackOverrides(r);

      const track = {
        track_number: trackNumber,
        slug, // for linking to lyrics JSON
        title,
        url: r.secure_url,
        duration: r.duration || null, // seconds
        album: ALBUM_NAME,
        artist: ARTIST_NAME,
        cover_art: COVER_ART_URL,
        producer: overrides.producer || DEFAULT_PRODUCER || null,
        writer: overrides.writer || DEFAULT_WRITER || null,
        credits: overrides.credits || DEFAULT_CREDITS || [],
        asset_id: r.asset_id,
      };

      tracks.push(track);
    });

    nextCursor = res.next_cursor;
  } while (nextCursor);

  return tracks;
}

async function main() {
  try {
    const tracks = await getAllTracksInFolder(FOLDER_PATH);

    // Sort by track_number if present, otherwise by title
    tracks.sort((a, b) => {
      if (a.track_number != null && b.track_number != null) {
        return a.track_number - b.track_number;
      }
      return a.title.localeCompare(b.title);
    });

    const albumJson = {
      album: ALBUM_NAME,
      artist: ARTIST_NAME,
      cover_art: COVER_ART_URL,
      tracks,
    };

    const outputPath = "album.json";
    fs.writeFileSync(outputPath, JSON.stringify(albumJson, null, 2), "utf8");

    console.log(`\n✅ Created ${outputPath}`);
    console.log(`Tracks: ${tracks.length}`);
  } catch (err) {
    console.error("Error generating album JSON:", err);
    process.exit(1);
  }
}

main();
