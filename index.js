const fs = require("fs");
const path = require("path");
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

const serverBaseDir = path.join("/app/server");
const cobblemonDataDir = path.join(
  serverBaseDir,
  "world",
  "cobblemonplayerdata"
);
const statsDataDir = path.join(serverBaseDir, "world", "stats");
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// Fonction pour obtenir le pseudo à partir de l'UUID
async function getUsernameFromUUID(uuid) {
  try {
    const response = await fetch(
      `https://api.minecraftservices.com/minecraft/profile/lookup/${uuid}`
    );
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const json = await response.json();
    return json.name || "?";
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du pseudo pour l'UUID ${uuid}:`,
      error.message
    );
    return null;
  }
}

async function generateImage(data, filename, title, dataText = "score") {
  const htmlContent = `
    <html>

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style type="text/tailwindcss">
      @theme {
        --color-clifford: #da373d;
      }
    </style>
    <style>
      @font-face {
        font-family: "LucideIcons";
        src: url(https://unpkg.com/lucide-static@latest/font/Lucide.ttf)
          format("truetype");
      }
      @import url("https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap");
      * {
        font-family: "Figtree", sans-serif;
        font-optical-sizing: auto;
        font-weight: 700;
        font-style: normal;
      }

      body {
        background: linear-gradient(#322e81, #7c194f);
      }

      .title {
        font-optical-sizing: auto;
        font-weight: 700;
        font-style: normal;
        color: #fff;
        font-weight: 600;
        text-align: center;
        margin: 30px 0;
        font-size: 34px;
      }

      .element-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 100%;
      }

      .element {
        max-width: 720px;
        border-radius: 10px;
        overflow: hidden;
      }

      .element:nth-child(1) {
        background-color: #f5e32d;
      }

      .element:nth-child(2) {
        background-color: #e8d0b3 !important;
      }

      .element:nth-child(3) {
        background-color: #dc6e2c;
      }

      .element:nth-child(2n) {
        background-color: #1e89ca;
      }
    </style>
  </head>

<body>
  <div class="w-full flex items-center justify-center py-6">
    <div
      class="-skew-x-12 bg-gradient-to-r from-yellow-300 to-yellow-500 text-4xl text-black font-bold px-8 py-4 -left-2 shadow-lg">
     ${title}
    </div>
  </div>
   <div class="flex items-center justify-center">
      <div
        class="mt-8 bg-black/30 rounded-lg overflow-hidden border border-white/10 shadow-2xl min-w-fit w-full max-w-6xl p-6 space-y-4"
      >
      ${data.map(
        (row, i) => `<div
          class="w-full flex items-center justify-between p-2 px-4 rounded-lg border-8 border-${
            i === 0
              ? "yellow-400"
              : i === 1
              ? "slate-400"
              : i === 2
              ? "amber-700"
              : "white/25"
          }"
        >
          <div class="flex items-center gap-10">
            <div class="flex items-center gap-2">
              <i data-lucide="${
                i === 0
                  ? "crown"
                  : i === 1
                  ? "trophy"
                  : i === 2
                  ? "award"
                  : "star"
              }" class="${
          i === 0
            ? "text-yellow-400"
            : i === 1
            ? "text-slate-400"
            : i === 2
            ? "text-amber-700"
            : "text-white/50"
        } w-10 h-10"></i>
              <span class="text-white font-bold text-3xl">${i + 1}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="relative">
                <div class="w-10 h-10 rounded-lg bg-white/10 overflow-hidden">
                  <img
                    src="https://mc-heads.net/avatar/${row.username}/100"
                    alt="${row.username}"
                    class="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-white font-medium text-3xl">${
                  row.username
                }</span>
              </div>
            </div>
          </div>
          <div class="p-4 text-right">
            <p
              class="font-mono font-bold text-3xl bg-gradient-to-r from-yellow-400 to-orange-300 bg-clip-text text-transparent"
            >
              ${row.count}
            </p>
            <p class="text-white font-bold text-xl">${dataText}</p>
          </div>
        </div>`
      )}
      </div>
    </div>

  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script>
  lucide.createIcons();
</script>
</body>

</html>`;

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // si tu l'as défini dans Dockerfile
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 600 });
  await page.setContent(htmlContent);
  await page.screenshot({
    path: path.join(publicDir, filename),
    fullPage: true,
  });
  await browser.close();

  console.log(`Done ${filename}`);
}

// Fonction principale pour traiter les fichiers JSON
async function processPlayerData() {
  let cobblemonResults = [];
  let deathResults = [];

  // Lire les sous-dossiers dans le répertoire principal
  const subdirs = fs.readdirSync(cobblemonDataDir);

  for (const subdir of subdirs) {
    const subdirPath = path.join(cobblemonDataDir, subdir);

    // Vérifier si c'est un dossier
    if (fs.statSync(subdirPath).isDirectory()) {
      // Lire les fichiers JSON dans le sous-dossier
      const files = fs
        .readdirSync(subdirPath)
        .filter((file) => file.endsWith(".json"));

      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        const rawData = fs.readFileSync(filePath);
        const jsonData = JSON.parse(rawData);

        const uuid = jsonData.uuid;
        const totalCaptureCount = jsonData.advancementData.totalCaptureCount;
        const totalShinyCaptureCount =
          jsonData.advancementData.totalShinyCaptureCount;
        const username = await getUsernameFromUUID(uuid);

        cobblemonResults.push({
          uuid,
          username,
          totalCaptureCount,
          totalShinyCaptureCount,
        });
      }
    }
  }

  const statFiles = fs
    .readdirSync(statsDataDir)
    .filter((file) => file.endsWith(".json"));
  for (const file of statFiles) {
    const filePath = path.join(statsDataDir, file);
    const rawData = fs.readFileSync(filePath);
    const jsonData = JSON.parse(rawData);

    const deathCount = jsonData.stats["minecraft:custom"]["minecraft:deaths"];
    const timePlayed =
      jsonData.stats["minecraft:custom"]["minecraft:play_time"];
    const username = await getUsernameFromUUID(file.split(".")[0]);

    deathResults.push({
      uuid: file.split(".")[0],
      username,
      deathCount,
      timePlayed,
    });
  }

  // Trier et générer les images
  const sortedCaptures = [...cobblemonResults].sort(
    (a, b) => b.totalCaptureCount - a.totalCaptureCount
  );
  const sortedShiny = [...cobblemonResults].sort(
    (a, b) => b.totalShinyCaptureCount - a.totalShinyCaptureCount
  );
  const sortedDeaths = [...deathResults].sort(
    (a, b) => b.deathCount - a.deathCount
  );
  const sortedTimePlayed = [...deathResults].sort(
    (a, b) => b.timePlayed - a.timePlayed
  );

  await generateImage(
    sortedCaptures.map((p) => ({
      username: p.username,
      count: p.totalCaptureCount,
    })),
    "tab1.png",
    "Classement des Captures",
    "Captures"
  );
  await generateImage(
    sortedShiny.map((p) => ({
      username: p.username,
      count: p.totalShinyCaptureCount,
    })),
    "tab2.png",
    "Classement des Captures Shiny",
    "Captures Shiny"
  );
  await generateImage(
    sortedDeaths.map((p) => ({
      username: p.username,
      count: p.deathCount,
    })),
    "tab3.png",
    "Qui est le plus GUEZ (morts)",
    "Morts"
  );
  await generateImage(
    sortedTimePlayed.map((p) => ({
      username: p.username,
      count: Math.round((p.timePlayed / 72000) * 100) / 100,
    })),
    "tab4.png",
    "Qui pue le plus (temps de jeu)",
    "Heures de jeu"
  );
}

processPlayerData();
setInterval(() => {
  processPlayerData();
}, 60 * 1000 * 5);
// every 5 minutes

app.use("/images", express.static(publicDir));
app.listen(PORT, () =>
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
);
