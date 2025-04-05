// Variables used by Scriptable.
// icon-color: red; icon-glyph: calendar-alt;
// Constants for data URL, file manager, and current date
const DATA_URL = "https://raw.githubusercontent.com/obegley95/Scriptable/refs/heads/main/_data/f1_schedule_2025.json";
const fm = FileManager.iCloud();
const now = new Date();

// Data for circuit information, including image filenames and country flags
const circuitData = {
   base_url: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/",
   circuits: {
      albert_park: {
         image: "Australia_Circuit.png",
         flag: "🇦🇺"
      },
      shanghai: {
         image: "China_Circuit.png",
         flag: "🇨🇳"
      },
      suzuka: {
         image: "Japan_Circuit.png",
         flag: "🇯🇵"
      },
      bahrain: {
         image: "Bahrain_Circuit.png",
         flag: "🇧🇭"
      },
      jeddah: {
         image: "Saudi_Arabia_Circuit.png",
         flag: "🇸🇦"
      },
      miami: {
         image: "Miami_Circuit.png",
         flag: "🇺🇸"
      },
      imola: {
         image: "Emilia_Romagna_Circuit.png",
         flag: "🇮🇹"
      },
      monaco: {
         image: "Monoco_Circuit.png",
         flag: "🇲🇨"
      },
      catalunya: {
         image: "Spain_Circuit.png",
         flag: "🇪🇸"
      },
      villeneuve: {
         image: "Canada_Circuit.png",
         flag: "🇨🇦"
      },
      red_bull_ring: {
         image: "Austria_Circuit.png",
         flag: "🇦🇹"
      },
      silverstone: {
         image: "Great_Britain_Circuit.png",
         flag: "🇬🇧"
      },
      spa: {
         image: "Belgium_Circuit.png",
         flag: "🇧🇪"
      },
      hungaroring: {
         image: "Hungary_Circuit.png",
         flag: "🇭🇺"
      },
      zandvort: {
         image: "Dutch_Circuit.png",
         flag: "🇳🇱"
      },
      monza: {
         image: "Monza_Circuit.png",
         flag: "🇮🇹"
      },
      baku: {
         image: "Azerbaijan_Circuit.png",
         flag: "🇦🇿"
      },
      marina_bay: {
         image: "Singapore_Circuit.png",
         flag: "🇸🇬"
      },
      americas: {
         image: "USA_Circuit.png",
         flag: "🇺🇸"
      },
      rodriguez: {
         image: "Mexico_Circuit.png",
         flag: "🇲🇽"
      },
      interlagos: {
         image: "Brazil_Circuit.png",
         flag: "🇧🇷"
      },
      vegas: {
         image: "Las_Vegas_Circuit.png",
         flag: "🇺🇸"
      },
      losail: {
         image: "Qatar_Circuit.png",
         flag: "🇶🇦"
      },
      yas_marina: {
         image: "Abu_Dhabi_Circuit.png",
         flag: "🇦🇪"
      }
   }
};

// Labels for different F1 session types
const sessionLabels = {
   fp1: "FP1",
   fp2: "FP2",
   fp3: "FP3",
   sprintQualifying: "SQ",
   sprint: "Sprint",
   qualifying: "Quali",
   race: "Race",
};

/**
 * Fetches the F1 race schedule data from the specified URL.
 * @returns {Promise<Array|null>} An array of race objects if successful, otherwise null.
 */
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

/**
 * Determines the index of the upcoming or most recent race in the schedule.
 * It finds the race with the closest future start time.
 * @param {Array} races An array of race objects.
 * @returns {number} The index of the closest upcoming race.
 */
async function getCurrentRaceIndex(races) {
   let closestRaceIdx = 0;
   let minTimeDiff = Infinity;

   races.forEach((race, index) => {
      const raceDateTime = new Date(race.sessions.race);
      const timeDiff = raceDateTime - now;
      // Check if the race is in the future and if its start time is closer than the current minimum difference
      if (timeDiff > 0 && timeDiff < minTimeDiff) {
         minTimeDiff = timeDiff;
         closestRaceIdx = index;
      }
   });

   return closestRaceIdx;
}

/**
 * Formats a timestamp into an object containing raw date, short weekday, date, and time.
 * @param {string|number} timestamp The timestamp to format (can be a string or a number).
 * @returns {object} An object with formatted date and time components.
 */
function formatDateTime(timestamp) {
   const date = new Date(timestamp);
   return {
      raw: date,
      day: date.toLocaleDateString("en-GB", {
         weekday: "short"
      }),
      date: date.toLocaleDateString("en-GB", {
         month: "numeric",
         day: "numeric"
      }),
      time: date.toLocaleTimeString("en-GB", {
         hour12: false,
         hour: "numeric",
         minute: "numeric"
      }),
   };
}

/**
 * Creates and returns the Scriptable widget.
 * @returns {Promise<ListWidget|null>} The created ListWidget if race data is available, otherwise null.
 */
async function createWidget() {
   const races = await getRaceData();
   if (!races) return null;

   const raceIdx = await getCurrentRaceIndex(races);
   const race = races[raceIdx];
   // Get circuit information or default to null image and empty flag
   const circuit = circuitData.circuits[race.circuitId] || {
      image: null,
      flag: ""
   };

   // Extract and format session times
   const sessions = Object.entries(race.sessions).map(([key, value]) => ({
      title: sessionLabels[key] || key.toUpperCase(), // Use predefined label or uppercase key
      ...formatDateTime(value), // Spread the formatted date and time into the session object
   }));
   // Sort sessions by their raw date and time
   sessions.sort((a, b) => a.raw - b.raw);

   // Determine if the device is using dark appearance for dynamic color selection
   const isDark = Device.isUsingDarkAppearance();

   // Create the main widget
   const w = new ListWidget();
   // Define a background gradient based on the device's appearance
   const gradient = new LinearGradient();
   gradient.colors = isDark ?
      [new Color("#1c1c27"), new Color("#111118")] :
      [new Color("#ffffff"), new Color("#f2f2f7")];
   gradient.locations = [0, 1];
   w.backgroundGradient = gradient;

   // Create a main vertical stack to hold all elements
   const mainVerticalStack = w.addStack();
   mainVerticalStack.layoutVertically();
   mainVerticalStack.setPadding(10, 0, 0, 10); // Top, Left, Bottom, Right padding

   // Create a horizontal stack for the title and potential spacing
   const titleContainer = mainVerticalStack.addStack();
   titleContainer.layoutHorizontally();
   titleContainer.addSpacer(); // Push the header stack to the center

   // Create a vertical stack for the race title and date range
   const headerStack = titleContainer.addStack();
   headerStack.layoutVertically();
   headerStack.centerAlignContent();

   // Format the race title with the circuit flag
   const titleOnly = `${race.name.split(":")[1].trim()} ${circuit.flag}`;
   const titleText = headerStack.addText(titleOnly);
   titleText.font = new Font("Avenir-Heavy", 17);
   titleText.textColor = Color.dynamic(new Color("#000000"), new Color("#ffffff"));
   titleText.centerAlignText();

   // Format the date range of the race weekend
   const start = new Date(race.sessions.fp1);
   const end = new Date(race.sessions.race);
   const rangeText = `${start.toLocaleDateString("en-GB", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`;
   const dateRange = headerStack.addText(rangeText);
   dateRange.font = new Font("Avenir-Light", 11);
   dateRange.textColor = Color.dynamic(new Color("#666666"), new Color("#bbbbbb"));
   dateRange.centerAlignText();

   titleContainer.addSpacer(); // Push the header stack to the center

   // Create a main horizontal stack to hold the circuit image and session information
   const mainStack = mainVerticalStack.addStack();
   mainStack.layoutHorizontally();

   // Circuit image display
   if (circuit.image) {
      try {
         const imgReq = new Request(`${circuitData.base_url}${circuit.image}`);
         const img = await imgReq.loadImage();
         const imgStack = mainStack.addStack();
         imgStack.layoutVertically();
         imgStack.size = new Size(180, 120);

         const imgElement = imgStack.addImage(img);
         imgElement.imageSize = new Size(180, 120);
         imgElement.cornerRadius = 10;
         imgElement.imageOpacity = 0.95;
         imgElement.centerAlignImage();

         imgStack.addSpacer();
      } catch (error) {
         console.error("Error loading circuit image:", error);
         // Optionally handle the case where the image fails to load
      }
   }

   mainStack.addSpacer(8); // Add some space between the image and session info

   // Vertical stack to hold session information
   const infoStack = mainStack.addStack();
   infoStack.layoutVertically();
   infoStack.setPadding(15, 0, 0, 0); // Top, Left, Bottom, Right padding for the session list

   // Loop through each session and add its information to the widget
   sessions.forEach(s => {
      const row = infoStack.addStack();
      row.layoutHorizontally();

      const isPast = s.raw < now; // Check if the session date/time is in the past
      const opacity = isPast ? 0.5 : 1; // Reduce opacity for past sessions
      const textColor = Color.dynamic(new Color("#000000"), new Color("#eaeae1"));

      // Display the session title
      const title = row.addText(s.title.padEnd(6)); // Pad the title for consistent spacing
      title.font = new Font("SF Mono", 12);
      title.textColor = textColor;
      title.textOpacity = opacity;
      title.lineLimit = 1;

      row.addSpacer(4); // Add some space between title and date

      // Display the session date
      const date = row.addText(s.date);
      date.font = new Font("SF Mono", 12);
      date.textColor = textColor;
      date.textOpacity = opacity;
      date.lineLimit = 1;

      row.addSpacer(6); // Add some space between date and time

      // Display the session time
      const time = row.addText(s.time);
      time.font = new Font("SF Mono", 12);
      time.textColor = textColor;
      time.textOpacity = opacity;
      time.lineLimit = 1;

      infoStack.addSpacer(4); // Add some vertical space between session rows
   });

   return w;
}

// Main execution block
(async () => {
   let resultWidget = await createWidget();
   // Set the widget if the script is running in a widget context
   if (config.runsInWidget) {
      if (resultWidget) Script.setWidget(resultWidget);
      Script.complete(); // Indicate that the script has finished running
   } else {
      // Present the widget in a medium size if the script is run outside of a widget
      if (resultWidget) await resultWidget.presentMedium();
   }
})();