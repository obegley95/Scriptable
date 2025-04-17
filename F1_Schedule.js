// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: calendar-alt;
// === SETTINGS ===
const INCLUDE_FLAG = false; // Set to true to show flags

const DATA_URL = "https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/schedule/f1_schedule_2025.json";

const sessionLabels = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprintQualifying: "Sprint Quali",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race"
};

const flagCodes = {
  albert_park: "AUS", shanghai: "CHN", suzuka: "JPN", bahrain: "BHR", jeddah: "SAU",
  miami: "USA", imola: "ITA", monaco: "MCO", catalunya: "ESP", villeneuve: "CAN",
  red_bull_ring: "AUT", silverstone: "GBR", spa: "BEL", hungaroring: "HUN",
  zandvoort: "NLD", monza: "ITA", baku: "AZE", marina_bay: "SGP", americas: "USA",
  rodriguez: "MEX", interlagos: "BRA", vegas: "USA", losail: "QAT", yas_marina: "ARE"
};

async function getRaceData() {
  try {
    const req = new Request(DATA_URL);
    const data = await req.loadJSON();
    if (!data?.races) {
      console.error("Race data is empty or malformed.");
      return [];
    }
    return data.races;
  } catch (e) {
    console.error("Failed to load race data. Please check the URL or your network connection.", e);
    return [];
  }
}

async function getUpcomingRace(races) {
  try {
    const now = Date.now();
    let nextRace = null;
    let soonestTime = Infinity;

    for (const race of races) {
      const raceTime = new Date(race.sessions?.race).getTime();
      const timeDiff = raceTime - now;
      if (timeDiff > 0 && timeDiff < soonestTime) {
        soonestTime = timeDiff;
        nextRace = race;
      }
    }

    if (!nextRace) {
      console.warn("No upcoming race found.");
    }

    return nextRace;
  } catch (e) {
    console.error("Error while determining the next race.", e);
    return null;
  }
}

function formatDateTime(ts) {
  if (!ts) return {};
  const d = new Date(ts);
  return {
    raw: d,
    day: d.toLocaleDateString("en-GB", { weekday: "short" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }),
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  };
}

function groupSessionsByDay(sessions) {
  try {
    const grouped = {};
    for (const [key, val] of Object.entries(sessions)) {
      const label = sessionLabels[key] || key;
      const dt = formatDateTime(val);
      if (!grouped[dt.day]) grouped[dt.day] = [];
      grouped[dt.day].push({ title: label, ...dt });
    }
    return grouped;
  } catch (e) {
    console.error("Error while grouping sessions by day.", e);
    return {};
  }
}

function sortSessions(sessionsByDay) {
  try {
    for (const day in sessionsByDay) {
      sessionsByDay[day].sort((a, b) => a.raw - b.raw);
    }
    return sessionsByDay;
  } catch (e) {
    console.error("Error while sorting sessions.", e);
    return {};
  }
}

async function fetchAndResizeImage(url, size) {
  try {
    const req = new Request(url);
    const img = await req.loadImage();
    const ctx = new DrawContext();
    ctx.size = size;
    ctx.opaque = false;
    ctx.respectScreenScale = true;
    ctx.drawImageInRect(img, new Rect(0, 0, size.width, size.height));
    return ctx.getImage();
  } catch (e) {
    console.error(`Failed to fetch or resize image from URL: ${url}`, e);
    return null;
  }
}

async function createWidget() {
  const now = new Date();
  const races = await getRaceData();
  if (races.length === 0) {
    return createErrorWidget("No race data available.");
  }

  const race = await getUpcomingRace(races);
  if (!race?.sessions) {
    return createErrorWidget("No upcoming race sessions found.");
  }

  let sessionsByDay = groupSessionsByDay(race.sessions);
  sessionsByDay = sortSessions(sessionsByDay);

  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1c1c1e");
  widget.setPadding(20, 20, 20, 20);

  const country = race.name
    .split(":")[1]
    ?.trim()
    .replace(/Grand Prix/i, "GP")
    .toUpperCase()
    .replace(/\s*\d{4}$/, "") || "GRAND PRIX";

  const location = race.location;
  const dateRange = `${formatDateTime(race.sessions.fp1).date} - ${formatDateTime(race.sessions.race).date}`;
  const round = String(race.round).padStart(2, "0");

  // === HEADER ===
  const header = widget.addStack();
  header.layoutHorizontally();

  const roundText = header.addText(`${round} `);
  roundText.font = Font.boldSystemFont(14);
  roundText.textColor = new Color("#aaaaaa");

  const countryText = header.addText(country);
  countryText.font = Font.boldSystemFont(14);
  countryText.textColor = Color.white();

  // === MAIN STACK ===
  const main = widget.addStack();
  main.layoutHorizontally();
  main.topAlignContent();

  const left = main.addStack();
  left.layoutVertically();
  left.size = new Size(150, 0);

  const locationText = left.addText(location);
  locationText.font = Font.mediumSystemFont(11);
  locationText.textColor = new Color("#f5425d");

  const rangeText = left.addText(dateRange);
  rangeText.font = Font.mediumSystemFont(10);
  rangeText.textColor = new Color("#aaaaaa");

  left.addSpacer(2);

  const circuitId = race.circuitId || "f1";
  const flagCode = flagCodes[circuitId];

  if (INCLUDE_FLAG && flagCode) {
    try {
      const flagUrl = `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/flags/${flagCode}.png`;
      const flagImage = await fetchAndResizeImage(flagUrl, new Size(14, 10));
      if (flagImage) {
        const img = left.addImage(flagImage);
        img.imageSize = new Size(14, 10);
        img.cornerRadius = 2;
      }
    } catch (e) {
      console.warn(`Flag not found for code: ${flagCode}`);
    }
  }

  const imageStack = left.addStack();
  imageStack.layoutVertically();
  imageStack.setPadding(0, 10, 10, 0);

  const trackUrl = `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/circuits/${circuitId}.png`;
  const fallbackTrackUrl = `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/circuits/f1.png`;

  let trackImage = null;
  let trackSize = new Size(120, 90);

  try {
    trackImage = await fetchAndResizeImage(trackUrl, trackSize);
  } catch {
    console.warn(`Track not found for ${circuitId}, loading fallback.`);
    trackSize = new Size(80, 60);
    try {
      trackImage = await fetchAndResizeImage(fallbackTrackUrl, trackSize);
    } catch (e) {
      console.error("Failed to load fallback track image", e);
    }
  }

  if (trackImage) {
    const img = imageStack.addImage(trackImage);
    img.imageSize = trackSize;
    img.cornerRadius = 5;
  }

  main.addSpacer(20);

  const right = main.addStack();
  right.layoutVertically();
  right.spacing = 2;
  right.addSpacer(2);

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (const day of Object.keys(sessionsByDay).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))) {
    const dayLabel = right.addText(day.toUpperCase());
    dayLabel.font = Font.boldSystemFont(10);
    dayLabel.textColor = new Color("#cccccc");

    const isPastDay = sessionsByDay[day]?.[0]?.raw < now;
    dayLabel.textOpacity = isPastDay ? 0.4 : 1;

    for (const session of sessionsByDay[day]) {
      const row = right.addStack();
      row.layoutHorizontally();

      const isPast = session.raw < now;
      const opacity = isPast ? 0.4 : 1;

      const title = row.addText(session.title);
      title.font = Font.systemFont(10);
      title.textColor = Color.white();
      title.textOpacity = opacity;

      row.addSpacer();

      const time = row.addText(session.time);
      time.font = Font.systemFont(10);
      time.textColor = Color.white();
      time.textOpacity = opacity;
    }

    right.addSpacer(1);
  }

  return widget;
}

// Helper function to create an error widget
function createErrorWidget(message) {
  const widget = new ListWidget();
  const text = widget.addText(message);
  text.textColor = Color.red();
  text.font = Font.boldSystemFont(14);
  text.centerAlignText();
  return widget;
}

// === RUN SCRIPT ===
const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
  Script.complete();
} else {
  await widget.presentMedium();
}
