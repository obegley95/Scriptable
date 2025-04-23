// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: calendar-alt;
// === SETTINGS ===
const INCLUDE_FLAG = true;
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
  albert_park: "AUS", shanghai: "CHN", suzuka: "JPN", bahrain: "BHR",
  jeddah: "SAU", miami: "USA", imola: "ITA", monaco: "MCO", catalunya: "ESP",
  villeneuve: "CAN", red_bull_ring: "AUT", silverstone: "GBR", spa: "BEL",
  hungaroring: "HUN", zandvoort: "NLD", monza: "ITA", baku: "AZE",
  marina_bay: "SGP", americas: "USA", rodriguez: "MEX", interlagos: "BRA",
  vegas: "USA", losail: "QAT", yas_marina: "ARE"
};

const now = new Date();

// === UTILITY FUNCTIONS ===
async function getRaceData() {
  try {
    const req = new Request(DATA_URL);
    const data = await req.loadJSON();
    return data.races;
  } catch (e) {
    console.error("Failed to load race data", e);
    return null;
  }
}

async function getUpcomingRace(races) {
  let closestIndex = 0;
  let soonestTime = Infinity;

  races.forEach((race, i) => {
    const raceTime = new Date(race.sessions.race).getTime();
    const timeDiff = raceTime - now.getTime();
    if (timeDiff > 0 && timeDiff < soonestTime) {
      soonestTime = timeDiff;
      closestIndex = i;
    }
  });

  return races[closestIndex];
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return {
    raw: d,
    day: d.toLocaleDateString("en-GB", { weekday: "short" }),
    time: d.toLocaleTimeString("en-GB", { hour12: true, hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    fullDayDate: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
  };
}

function groupSessionsByDay(sessions) {
  const grouped = {};
  for (const [key, val] of Object.entries(sessions)) {
    const label = sessionLabels[key] || key;
    const dt = formatDateTime(val);
    if (!grouped[dt.day]) grouped[dt.day] = [];
    grouped[dt.day].push({ title: label, ...dt });
  }
  for (const day in grouped) {
    grouped[day].sort((a, b) => a.raw.getTime() - b.raw.getTime());
  }
  return grouped;
}

function groupSessionsByDaySorted(sessions) {
  const sessionList = [];

  for (const [key, val] of Object.entries(sessions)) {
    const label = sessionLabels[key] || key;
    const dt = formatDateTime(val);
    sessionList.push({ title: label, ...dt });
  }

  sessionList.sort((a, b) => a.raw - b.raw);

  const grouped = {};
  for (const session of sessionList) {
    const dayKey = session.fullDayDate;
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(session);
  }

  return grouped;
}

async function fetchAndFitImage(url, maxSize) {
  try {
    const img = await (new Request(url)).loadImage();
    const aspectRatio = img.size.width / img.size.height;
    let width = maxSize.width;
    let height = width / aspectRatio;
    if (height > maxSize.height) {
      height = maxSize.height;
      width = height * aspectRatio;
    }
    const dx = (maxSize.width - width) / 2;
    const dy = (maxSize.height - height) / 2;

    const ctx = new DrawContext();
    ctx.size = maxSize;
    ctx.opaque = false;
    ctx.respectScreenScale = true;
    ctx.drawImageInRect(img, new Rect(dx, dy, width, height));
    return ctx.getImage();
  } catch {
    return null;
  }
}

// === SMALL WIDGET ===
async function createSmallWidget(race, sessionsByDay) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1c1c1e");
  widget.setPadding(0, 15, 6, 15);

  const country = race.name.split(":")[1].trim().replace(/Grand Prix/i, "GP").toUpperCase().replace(/\s*\d{4}$/, "");
  const location = race.location;
  const round = race.round.toString().padStart(2, "0");
  const circuitId = race.circuitId || "saudi";
  const flagCode = flagCodes[circuitId];
  const dateRange = `${formatDateTime(race.sessions.fp1).date} - ${formatDateTime(race.sessions.race).date}`;

  const titleStack = widget.addStack();
  titleStack.layoutHorizontally();
  titleStack.centerAlignContent();
  const roundText = titleStack.addText(`${round} `);
  roundText.font = Font.boldSystemFont(11);
  roundText.textColor = new Color("#aaaaaa");
  const countryText = titleStack.addText(country);
  countryText.font = Font.boldSystemFont(11);
  countryText.textColor = Color.white();

  widget.addSpacer(2);

  const locText = widget.addText(location);
  locText.font = Font.mediumSystemFont(8);
  locText.textColor = new Color("#f5425d");

  const dateText = widget.addText(dateRange);
  dateText.font = Font.mediumSystemFont(8);
  dateText.textColor = new Color("#aaaaaa");

  if (INCLUDE_FLAG && flagCode) {
    try {
      const flagUrl = `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/flags/${flagCode}.png`;
      const flagImg = await new Request(flagUrl).loadImage();
      const flagRow = widget.addStack();
      flagRow.centerAlignContent();
      const flagElement = flagRow.addImage(flagImg);
      flagElement.imageSize = new Size(12, 14);
      flagElement.cornerRadius = 8;
      widget.addSpacer(4);
    } catch (e) {}
  } else {
    widget.addSpacer(4);
  }

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (const day of Object.keys(sessionsByDay).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))) {
    const firstSession = sessionsByDay[day][0];
    const isPastDay = firstSession && firstSession.raw < now;

    const dayLabel = widget.addText(day.toUpperCase());
    dayLabel.font = Font.boldSystemFont(9);
    dayLabel.textColor = new Color("#cccccc");
    dayLabel.textOpacity = isPastDay ? 0.4 : 1;

    for (const session of sessionsByDay[day]) {
      const isPast = session.raw < now;
      const opacity = isPast ? 0.4 : 1;
      const row = widget.addStack();
      row.layoutHorizontally();

      const title = row.addText(session.title);
      title.font = Font.systemFont(9);
      title.textColor = Color.white();
      title.textOpacity = opacity;

      row.addSpacer();

      const time = row.addText(session.time);
      time.font = Font.systemFont(9);
      time.textColor = Color.white();
      time.textOpacity = opacity;
    }

    widget.addSpacer(2);
  }

  return widget;
}

// === MEDIUM WIDGET ===
async function createMediumWidget(race, sessionsByDay) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1c1c1e");
  widget.setPadding(20, 20, 20, 20);

  const country = race.name.split(":")[1].trim().replace(/Grand Prix/i, "GP").toUpperCase().replace(/\s*\d{4}$/, "");
  const location = race.location;
  const round = race.round.toString().padStart(2, "0");
  const circuitId = race.circuitId || "saudi";
  const flagCode = flagCodes[circuitId];
  const dateRange = `${formatDateTime(race.sessions.fp1).date} - ${formatDateTime(race.sessions.race).date}`;

  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  const roundText = headerStack.addText(`${round} `);
  roundText.font = Font.boldSystemFont(14);
  roundText.textColor = new Color("#aaaaaa");

  const countryText = headerStack.addText(country);
  countryText.font = Font.boldSystemFont(14);
  countryText.textColor = Color.white();

  if (INCLUDE_FLAG && flagCode) {
    try {
      const flagUrl = `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/flags/${flagCode}.png`;
      const flagImg = await new Request(flagUrl).loadImage();
      headerStack.addSpacer(6);
      const flagElement = headerStack.addImage(flagImg);
      flagElement.imageSize = new Size(20, 14);
      flagElement.cornerRadius = 3;
    } catch (e) {}
  }

  const mainStack = widget.addStack();
  mainStack.layoutHorizontally();
  mainStack.topAlignContent();

  const leftStack = mainStack.addStack();
  leftStack.layoutVertically();
  leftStack.size = new Size(150, 0);

  const locationText = leftStack.addText(location);
  locationText.font = Font.mediumSystemFont(11);
  locationText.textColor = new Color("#f5425d");

  const rangeText = leftStack.addText(dateRange);
  rangeText.font = Font.mediumSystemFont(10);
  rangeText.textColor = new Color("#aaaaaa");

  leftStack.addSpacer(2);

  const imageContainer = leftStack.addStack();
  imageContainer.layoutVertically();
  imageContainer.setPadding(0, 10, 10, 0);

  const maxTrackSize = new Size(130, 90);
  let trackImage = await fetchAndFitImage(
    `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/circuits/${circuitId}.png`,
    maxTrackSize
  );

  if (!trackImage) {
    trackImage = await fetchAndFitImage(
      `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/circuits/f1.png`,
      maxTrackSize
    );
  }

  if (trackImage) {
    const trackElement = imageContainer.addImage(trackImage);
    trackElement.imageSize = maxTrackSize;
    trackElement.cornerRadius = 5;
  }

  mainStack.addSpacer(20);

  const rightStack = mainStack.addStack();
  rightStack.layoutVertically();
  rightStack.addSpacer(2);
  rightStack.spacing = 2;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (const day of Object.keys(sessionsByDay).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))) {
    const dayLabel = rightStack.addText(day.toUpperCase());
    dayLabel.font = Font.boldSystemFont(10);
    dayLabel.textColor = new Color("#cccccc");
    const firstSession = sessionsByDay[day][0];
    dayLabel.textOpacity = firstSession.raw < now ? 0.4 : 1;

    for (const session of sessionsByDay[day]) {
      const row = rightStack.addStack();
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

    rightStack.addSpacer(1);
  }

  return widget;
}

// === LARGE WIDGET ===
async function createLargeWidget(race, sessionsByDay) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#111111");
  widget.setPadding(12, 14, 12, 14);
  widget.spacing = 2;

  const circuitId = race.circuitId || "unknown";
  const flagCode = flagCodes[circuitId];

  const roundNum = race.round.toString().padStart(2, "0");
  const headerStack = widget.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  const roundText = headerStack.addText(`${roundNum} `);
  roundText.font = Font.semiboldSystemFont(16);
  roundText.textColor = new Color("#888");

  const titleText = headerStack.addText(race.name.split(":")[1].trim().toUpperCase());
  titleText.font = Font.boldSystemFont(16);
  titleText.textColor = Color.white();

  if (INCLUDE_FLAG && flagCode) {
    try {
      const flagUrl = `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/flags/${flagCode}.png`;
      const flagImg = await new Request(flagUrl).loadImage();
      headerStack.addSpacer(6);
      const flagElement = headerStack.addImage(flagImg);
      flagElement.imageSize = new Size(20, 14);
      flagElement.cornerRadius = 3;
    } catch {}
  }

  const locationText = widget.addText(race.location);
  locationText.font = Font.mediumSystemFont(12);
  locationText.textColor = new Color("#f5425d");

  const dateRangeText = `${formatDateTime(race.sessions.fp1).date} - ${formatDateTime(race.sessions.race).date}`;
  const rangeLabel = widget.addText(dateRangeText);
  rangeLabel.font = Font.mediumSystemFont(11);
  rangeLabel.textColor = new Color("#bbbbbb");

  widget.addSpacer(4);

  const maxTrackSize = new Size(200, 100);
  let trackImage = await fetchAndFitImage(
    `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/circuits/${circuitId}.png`,
    maxTrackSize
  );

  if (!trackImage) {
    trackImage = await fetchAndFitImage(
      `https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/circuits/f1.png`,
      maxTrackSize
    );
  }

  if (trackImage) {
    const imageStack = widget.addStack();
    imageStack.layoutHorizontally();
    imageStack.centerAlignContent();
    imageStack.addSpacer();
    const trackElement = imageStack.addImage(trackImage);
    trackElement.imageSize = maxTrackSize;
    trackElement.cornerRadius = 5;
    imageStack.addSpacer();
  }

  widget.addSpacer(6);

  for (const [day, sessions] of Object.entries(sessionsByDay)) {
    const dayLabel = widget.addText(day.toUpperCase());
    dayLabel.font = Font.boldSystemFont(12);
    dayLabel.textColor = new Color("#cccccc");
    dayLabel.textOpacity = sessions[0].raw < now ? 0.4 : 1;

    for (const session of sessions) {
      const row = widget.addStack();
      row.layoutHorizontally();

      const isPast = session.raw < now;
      const opacity = isPast ? 0.4 : 1;

      const title = row.addText(session.title);
      title.font = Font.systemFont(12);
      title.textColor = Color.white();
      title.textOpacity = opacity;

      row.addSpacer();

      const time = row.addText(session.time);
      time.font = Font.systemFont(12);
      time.textColor = Color.white();
      time.textOpacity = opacity;
    }

    widget.addSpacer(4);
  }

  return widget;
}

// === RUN ===
const races = await getRaceData();
if (!races) return;

const race = await getUpcomingRace(races);

let widget;
if (config.widgetFamily === "small") {
  const grouped = groupSessionsByDay(race.sessions);
  widget = await createSmallWidget(race, grouped);
} else if (config.widgetFamily === "medium") {
  const grouped = groupSessionsByDay(race.sessions);
  widget = await createMediumWidget(race, grouped);
} else {
  const grouped = groupSessionsByDaySorted(race.sessions);
  widget = await createLargeWidget(race, grouped);
}

if (widget) {
  Script.setWidget(widget);
  Script.complete();
}