// Variables used by Scriptable.
// icon-color: red; icon-glyph: calendar;
const DATA_URL = "https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/f1_schedule_2025.json";
const fm = FileManager.iCloud();
const now = new Date();

const circuitData = {
    base_url: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/",
    circuits: {
        albert_park: { image: "Australia_Circuit.png", flag: "🇦🇺" },
        shanghai: { image: "China_Circuit.png", flag: "🇨🇳" },
        suzuka: { image: "Japan_Circuit.png", flag: "🇯🇵" },
        bahrain: { image: "Bahrain_Circuit.png", flag: "🇧🇭" },
        jeddah: { image: "Saudi_Arabia_Circuit.png", flag: "🇸🇦" },
        miami: { image: "Miami_Circuit.png", flag: "🇺🇸" },
        imola: { image: "Emilia_Romagna_Circuit.png", flag: "🇮🇹" },
        monaco: { image: "Monoco_Circuit.png", flag: "🇲🇨" },
        catalunya: { image: "Spain_Circuit.png", flag: "🇪🇸" },
        villeneuve: { image: "Canada_Circuit.png", flag: "🇨🇦" },
        red_bull_ring: { image: "Austria_Circuit.png", flag: "🇦🇹" },
        silverstone: { image: "Great_Britain_Circuit.png", flag: "🇬🇧" },
        spa: { image: "Belgium_Circuit.png", flag: "🇧🇪" },
        hungaroring: { image: "Hungary_Circuit.png", flag: "🇭🇺" },
        zandvort: { image: "Dutch_Circuit.png", flag: "🇳🇱" },
        monza: { image: "Monza_Circuit.png", flag: "🇮🇹" },
        baku: { image: "Azerbaijan_Circuit.png", flag: "🇦🇿" },
        marina_bay: { image: "Singapore_Circuit.png", flag: "🇸🇬" },
        americas: { image: "USA_Circuit.png", flag: "🇺🇸" },
        rodriguez: { image: "Mexico_Circuit.png", flag: "🇲🇽" },
        interlagos: { image: "Brazil_Circuit.png", flag: "🇧🇷" },
        vegas: { image: "Las_Vegas_Circuit.png", flag: "🇺🇸" },
        losail: { image: "Qatar_Circuit.png", flag: "🇶🇦" },
        yas_marina: { image: "Abu_Dhabi_Circuit.png", flag: "🇦🇪" }
    }
};

const sessionLabels = {
    fp1: "FP1",
    fp2: "FP2",
    fp3: "FP3",
    sprintQualifying: "SQ",
    sprint: "Sprint",
    qualifying: "Quali",
    race: "Race",
};

async function getRaceData() {
    try {
        const req = new Request(DATA_URL);
        const data = await req.loadJSON();
        return data.races;
    } catch (e) {
        console.error("Error fetching race data", e);
        return null;
    }
}

async function getCurrentRaceIndex(races) {
    let closestRaceIdx = 0;
    let minTimeDiff = Infinity;

    races.forEach((race, index) => {
        const raceDateTime = new Date(race.sessions.race);
        const timeDiff = raceDateTime - now;
        if (timeDiff > 0 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestRaceIdx = index;
        }
    });

    return closestRaceIdx;
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return {
        raw: date,
        day: date.toLocaleDateString("en-GB", { weekday: "short" }),
        date: date.toLocaleDateString("en-GB", { month: "numeric", day: "numeric" }),
        time: date.toLocaleTimeString("en-GB", { hour12: false, hour: "numeric", minute: "numeric" }),
    };
}

async function createWidget() {
    const races = await getRaceData();
    if (!races) return null;

    const raceIdx = await getCurrentRaceIndex(races);
    const race = races[raceIdx];
    const circuit = circuitData.circuits[race.circuitId] || { image: null, flag: "" };

    const sessions = Object.entries(race.sessions).map(([key, value]) => ({
        title: sessionLabels[key] || key.toUpperCase(),
        ...formatDateTime(value),
    }));
    sessions.sort((a, b) => a.raw - b.raw);

    const w = new ListWidget();
    const gradient = new LinearGradient();
    gradient.colors = [new Color("#15151e"), new Color("#15151e")];
    gradient.locations = [0, 1];
    w.backgroundGradient = gradient;

    const mainVerticalStack = w.addStack();
    mainVerticalStack.layoutVertically();
    mainVerticalStack.setPadding(27, 0, 0, 10);

    // Only show Grand Prix name with flag
    const titleContainer = mainVerticalStack.addStack();
    titleContainer.layoutHorizontally();
    titleContainer.addSpacer();

    const headerStack = titleContainer.addStack();
    headerStack.layoutVertically();
    headerStack.centerAlignContent();

    const titleOnly = `${race.name.split(":")[1].trim()} ${circuit.flag}`;
    const titleText = headerStack.addText(titleOnly);
    titleText.font = new Font("Menlo-Bold", 15);
    titleText.textColor = new Color("#eaeae1");
    titleText.centerAlignText();

    titleContainer.addSpacer();

    const mainStack = mainVerticalStack.addStack();
    mainStack.layoutHorizontally();

    if (circuit.image) {
        const imgReq = new Request(`${circuitData.base_url}${circuit.image}`);
        const img = await imgReq.loadImage();
        const imgStack = mainStack.addStack();
        imgStack.layoutVertically();
        imgStack.size = new Size(160, 160);
        const imgElement = imgStack.addImage(img);
        imgElement.imageSize = new Size(160, 160);
        imgElement.cornerRadius = 5;
        imgElement.centerAlignImage();
        imgStack.addSpacer();
    }

    mainStack.addSpacer(10);

    const infoStack = mainStack.addStack();
    infoStack.layoutVertically();
    infoStack.setPadding(20, 0, 0, 0);

    sessions.forEach(s => {
        const row = infoStack.addStack();
        row.layoutHorizontally();

        const title = row.addText(s.title.padEnd(6));
        title.font = new Font("Menlo-Bold", 12);
        title.textColor = new Color("#eaeae1");
        title.textOpacity = s.raw < now ? 0.5 : 1;

        row.addSpacer(5);

        const date = row.addText(s.date);
        date.font = new Font("Menlo-Bold", 12);
        date.textColor = new Color("#eaeae1");
        date.textOpacity = s.raw < now ? 0.5 : 1;

        row.addSpacer(10);

        const time = row.addText(s.time);
        time.font = new Font("Menlo-Bold", 12);
        time.textColor = new Color("#eaeae1");
        time.textOpacity = s.raw < now ? 0.5 : 1;

        infoStack.addSpacer(5);
    });

    return w;
}

(async () => {
    let resultWidget = await createWidget();
    if (config.runsInWidget) {
        if (resultWidget) Script.setWidget(resultWidget);
        Script.complete();
    } else {
        if (resultWidget) await resultWidget.presentMedium();
    }
})();