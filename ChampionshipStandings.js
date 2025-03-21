const DRIVER_STANDINGS_URL = "https://api.jolpi.ca/ergast/f1/2025/driverstandings.json";
const CACHE_FILE = "driver_standings_cache.json";
const CACHE_EXPIRY_HOURS = 3;

const TEAM_COLORS = {
  "red_bull": "#3671C6",
  "mercedes": "#27F4D2",
  "ferrari": "#E80020",
  "mclaren": "#FF8000",
  "aston_martin": "#229971",
  "alpine": "#00A1E8",
  "williams": "#005AFF",
  "rb": "#6692FF",
  "sauber": "#52E252",
  "haas": "#B6BABD"
};

function getTeamColor(constructorId) {
  return new Color(TEAM_COLORS[constructorId.toLowerCase()] || "#808080");
}

let widget = new ListWidget();
widget.setPadding(10, 10, 10, 10);

let fm = FileManager.iCloud();
let cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
let imgPath = fm.joinPath(fm.documentsDirectory(), "Backgrounds/medium_top.jpg");

if (fm.fileExists(imgPath)) {
  widget.backgroundImage = await fm.readImage(imgPath);
} else {
  console.log("Background image not found. Using fallback color.");
  widget.backgroundColor = new Color("#1C1C1E");
}

async function fetchDriverStandings() {
  let cachedData = null;
  
  if (fm.fileExists(cachePath)) {
    let fileModifiedTime = fm.modificationDate(cachePath);
    let ageInHours = (Date.now() - fileModifiedTime.getTime()) / (1000 * 60 * 60);
    
    cachedData = JSON.parse(fm.readString(cachePath));

    if (ageInHours < CACHE_EXPIRY_HOURS) {
      console.log("Using cached data.");
      return cachedData;
    }
    
    console.log("Cache expired, fetching new data...");
  } else {
    console.log("No cache found, fetching new data...");
  }

  try {
    let response = await new Request(DRIVER_STANDINGS_URL).loadJSON();
    if (!response) throw new Error("Empty response");

    fm.writeString(cachePath, JSON.stringify(response));
    console.log("Data fetched from API and cached.");
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);

    if (cachedData) {
      console.log("Using stale cache due to fetch failure.");
      return cachedData;
    }

    return null;
  }
}

async function createWidgetWithDriverData() {
  const driverStandings = await fetchDriverStandings();
  
  if (!driverStandings?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
    console.log("No valid driver standings data available.");
    return null;
  }

  const standings = driverStandings.MRData.StandingsTable.StandingsLists[0].DriverStandings;
  const roundNumber = driverStandings.MRData.StandingsTable.round || "N/A";
  const totalDrivers = standings.length;

  let MAX_DRIVERS_PER_COLUMN = totalDrivers > 20 ? 6 : 5;
  let RECT_SIZE = totalDrivers > 20 ? new Size(80, 18) : new Size(80, 22);
  const numColumns = Math.ceil(totalDrivers / MAX_DRIVERS_PER_COLUMN);

  let titleStack = widget.addStack();
  titleStack.layoutHorizontally();
  titleStack.centerAlignContent();
  titleStack.addSpacer();

  let title = titleStack.addText(`2025 Driver Standings - R${roundNumber}`);
  title.font = Font.boldSystemFont(14);
  title.textColor = Color.white();

  titleStack.addSpacer();
  widget.addSpacer();

  let positionStack = widget.addStack();
  positionStack.layoutHorizontally();
  positionStack.spacing = 3;

  let columns = Array.from({ length: numColumns }, () => {
    let col = positionStack.addStack();
    col.layoutVertically();
    col.flex = 1;
    return col;
  });

  standings.forEach((entry, index) => {
    let position = parseInt(entry.position, 10) || index + 1;
    let points = parseInt(entry.points, 10) || 0;

    let constructorId = (entry.Constructors[0]?.constructorId || "unknown").toLowerCase();
    let teamColor = getTeamColor(constructorId);

    if (!TEAM_COLORS[constructorId]) {
      console.warn(`Missing team color for ${constructorId}`);
    }

    let columnIndex = Math.min(Math.floor(index / MAX_DRIVERS_PER_COLUMN), columns.length - 1);
    if (!columns[columnIndex]) return;

    let driverStack = columns[columnIndex].addStack();
    driverStack.backgroundColor = teamColor;
    driverStack.cornerRadius = 5;
    driverStack.setPadding(5, 5, 5, 5);
    driverStack.size = RECT_SIZE;
    driverStack.layoutHorizontally();
    driverStack.centerAlignContent();

    let positionText = driverStack.addText(`${position}`);
    positionText.textColor = Color.white();
    positionText.font = Font.boldSystemFont(RECT_SIZE.height / 2);

    driverStack.addSpacer();

    let codeText = driverStack.addText(entry.Driver.code || "N/A");
    codeText.textColor = Color.white();
    codeText.font = Font.boldSystemFont(RECT_SIZE.height / 2);

    driverStack.addSpacer();

    let pointsText = driverStack.addText(`${points}`);
    pointsText.textColor = Color.white();
    pointsText.font = Font.boldSystemFont(RECT_SIZE.height / 2);

    columns[columnIndex].addSpacer(6);
  });

  return widget;
}

let resultWidget = await createWidgetWithDriverData();

if (resultWidget) {
  if (config.runsInWidget) {
    Script.setWidget(resultWidget);
    Script.complete();
  } else {
    await resultWidget.presentMedium();
  }
} else {
  console.log("No widget created due to missing data.");
}
