const fs = require("fs");
const path = require("path");
const express = require("express");
const puppeteer = require("puppeteer");
const { createCanvas } = require("canvas");

const app = express();
const PORT = 3010;

// Chemin vers le répertoire cobblemonplayerdata
const cobblemonDataDir = path.join(
  __dirname,
  "..",
  "star-academy",
  "world",
  "cobblemonplayerdata"
);
const statsDataDir = path.join(
  __dirname,
  "..",
  "star-academy",
  "world",
  "stats"
);
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

async function generateImage(data, filename, title) {
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
    font-family: 'LucideIcons';
    src: url(https://unpkg.com/lucide-static@latest/font/Lucide.ttf) format('truetype');
  }
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
* {
   font-family: "Montserrat", sans-serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
  }

    body {
      background-color: #000;
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

    .element {
      max-width: 720px;
    }

    .element:nth-child(1) {
      background-color: #f5e32d;
    }

    .element:nth-child(2) {
      background-color: #e8d0b3!important;
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
      class="-skew-x-12 bg-gradient-to-r from-yellow-300 to-yellow-500 text-2xl text-black font-bold px-6 py-2 -left-2 shadow-lg">
     ${title}
    </div>
  </div>
   <div class="pb-12 flex items-center justify-center">
    <div
      class="element mt-16 bg-gradient-to-b from-black/95 to-black/90 rounded-lg overflow-hidden border border-white/10 shadow-2xl min-w-fit w-full">
      <table class="w-full">
        <thead>
          <tr class="border-b border-white/10">
            <th class="text-white/70 w-24 p-4 text-left">Position</th>
            <th class="text-white/70 p-4 text-left">Joueur</th>
            <th class="text-white/70 p-4 text-right">Captures</th>
          </tr>
        </thead>
        <tbody>
          <div>
            ${data.map(
              (row, i) => `<tr class="group relative cursor-pointer"
              >
              <td class="relative p-4">
                <div class="flex items-center gap-2">
                  <i data-lucide="trophy" class="${
                    i === 0
                      ? "text-yellow-400"
                      : i === 1
                      ? "text-slate-400"
                      : i === 2
                      ? "text-amber-700"
                      : "hidden"
                  }"></i>
                  <span class="text-white font-bold">${i + 1}</span>
                </div>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <div class="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                      <img src="https://mc-heads.net/avatar/${
                        row.username
                      }/100" alt="player username"
                        class="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-white font-medium">${row.username}</span>
                  </div>
                </div>
              </td>
              <td class="p-4 text-right">
                <span class="font-mono text-white font-bold">${row.count}</span>
              </td>
            </tr>`
            )}
          </div>
        </tbody>
      </table>
    </div>
  </div>

  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script>
  lucide.createIcons();
</script>
</body>

</html>`;

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser", // adjust if different
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
    const username = await getUsernameFromUUID(file.split(".")[0]);

    deathResults.push({
      uuid: file.split(".")[0],
      username,
      deathCount,
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

  await generateImage(
    sortedCaptures.map((p) => ({
      username: p.username,
      count: p.totalCaptureCount,
    })),
    "tab1.png",
    "Classement des Captures"
  );
  await generateImage(
    sortedShiny.map((p) => ({
      username: p.username,
      count: p.totalShinyCaptureCount,
    })),
    "tab2.png",
    "Classement des Captures Shiny"
  );
  await generateImage(
    sortedDeaths.map((p) => ({
      username: p.username,
      count: p.deathCount,
    })),
    "tab3.png",
    "Qui est le plus GUEZ (morts)"
  );
}

processPlayerData();
setInterval(() => {
  processPlayerData();
}, 60 * 1000 * 30);
// every 30 minutes

app.use("/images", express.static(publicDir));
app.listen(PORT, () =>
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
);
