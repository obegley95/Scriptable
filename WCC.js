// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: award;
// Configuration
const CONSTRUCTOR_STANDINGS_URL = "https://api.jolpi.ca/ergast/f1/2025/constructorstandings.json";
const CACHE_FILE = "constructor_standings_cache.json";
const CACHE_EXPIRY_HOURS = 5;

// Team Info Mapping
const TEAM_INFO = {
  "red_bull": { color: "#3671C6", shorthand: "RBR", name: "Red Bull" },
  "mercedes": { color: "#27F4D2", shorthand: "MER", name: "Mercedes" },
  "ferrari": { color: "#E80020", shorthand: "FER", name: "Ferrari" },
  "mclaren": { color: "#FF8000", shorthand: "MCL", name: "McLaren" },
  "aston_martin": { color: "#229971", shorthand: "AST", name: "Aston Martin" },
  "alpine": { color: "#00A1E8", shorthand: "ALP", name: "Alpine" },
  "williams": { color: "#005AFF", shorthand: "WIL", name: "Williams" },
  "rb": { color: "#6692FF", shorthand: "RB", name: "Racing Bulls" },
  "sauber": { color: "#52E252", shorthand: "SAU", name: "Sauber" },
  "haas": { color: "#B6BABD", shorthand: "HAA", name: "Haas" }
};

function getTeamColor(constructorId) {
  return new Color(TEAM_INFO[constructorId]?.color || "#808080");
}

function getTeamShorthand(constructorId) {
  return TEAM_INFO[constructorId]?.shorthand || constructorId.toUpperCase();
}

function getTeamName(constructorId) {
  return TEAM_INFO[constructorId]?.name || constructorId;
}

const fm = FileManager.iCloud();
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);

let widget = new ListWidget();
widget.setPadding(12, 12, 12, 12);
widget.backgroundColor = new Color("#1c1c1e");

async function fetchConstructorStandings() {
  let cachedData = null;

  if (fm.fileExists(cachePath)) {
    let fileModifiedTime = fm.modificationDate(cachePath);
    let ageInHours = (Date.now() - fileModifiedTime.getTime()) / (1000 * 60 * 60);
    cachedData = JSON.parse(fm.readString(cachePath));
    if (ageInHours < CACHE_EXPIRY_HOURS) return cachedData;
  }

  try {
    let response = await new Request(CONSTRUCTOR_STANDINGS_URL).loadJSON();
    if (!response) throw new Error("Empty response");
    fm.writeString(cachePath, JSON.stringify(response));
    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    if (cachedData) return cachedData;
    return null;
  }
}

async function createConstructorWidget() {
  const data = await fetchConstructorStandings();
  const standings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;
  const roundNumber = data?.MRData?.StandingsTable?.round || "N/A";

  if (!standings) return null;

  const isSmall = config.widgetFamily === "small";
  const MAX_PER_COLUMN = 5;

  // Header
  let headingStack = widget.addStack();
  headingStack.layoutHorizontally();
  headingStack.centerAlignContent();
  headingStack.setPadding(0, 0, 4, 0);

  let titleText = headingStack.addText("WCC Standings");
  titleText.font = isSmall ? Font.boldSystemFont(11) : Font.boldSystemFont(14);
  titleText.textColor = Color.white();

  headingStack.addSpacer();

  let roundText = headingStack.addText(`Round ${roundNumber}`);
  roundText.font = isSmall ? Font.systemFont(8) : Font.systemFont(12);
  roundText.textColor = Color.gray();

  // Two-column layout
  const columnsStack = widget.addStack();
  columnsStack.layoutHorizontally();
  columnsStack.spacing = 8;

  let columns = [columnsStack.addStack(), columnsStack.addStack()];
  columns.forEach(col => {
    col.layoutVertically();
    col.spacing = 4;
    col.centerAlignContent();
  });

  standings.forEach((entry, index) => {
    if (index >= MAX_PER_COLUMN * 2) return;

    const position = parseInt(entry.position) || index + 1;
    const points = parseInt(entry.points) || 0;
    const constructorId = (entry.Constructor?.constructorId || "unknown").toLowerCase();
    const teamColor = getTeamColor(constructorId);

    const teamLabel = isSmall ? getTeamShorthand(constructorId) : getTeamName(constructorId);
    const fontSize = isSmall ? 9.5 : 11;

    const columnIndex = Math.floor(index / MAX_PER_COLUMN);
    const column = columns[columnIndex];

    const row = column.addStack();
    row.layoutHorizontally();
    row.setPadding(3, 5, 3, 5);
    row.backgroundColor = new Color("#1c1c1e");
    row.borderColor = teamColor;
    row.borderWidth = 2;
    row.cornerRadius = 6;

    const posText = row.addText(`${position}`);
    posText.font = Font.mediumSystemFont(fontSize);
    posText.textColor = Color.white();

    row.addSpacer(4);

    const nameText = row.addText(teamLabel);
    nameText.font = Font.mediumSystemFont(fontSize);
    nameText.textColor = Color.white();
    nameText.lineLimit = 1;

    row.addSpacer();

    const ptsText = row.addText(`${points}`);
    ptsText.font = Font.mediumSystemFont(fontSize);
    ptsText.textColor = Color.white();
  });

  return widget;
}

// Run script
let resultWidget = await createConstructorWidget();
if (resultWidget) {
  if (config.runsInWidget) {
    Script.setWidget(resultWidget);
    Script.complete();
  } else {
    const previewSize = config.widgetFamily || "medium";
    if (previewSize === "small") {
      await resultWidget.presentSmall();
    } else {
      await resultWidget.presentMedium();
    }
  }
} else {
  console.log("Widget failed to build.");
}