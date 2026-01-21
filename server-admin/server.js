const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Chemins des fichiers
const DATA_FILE = path.join(__dirname, "data.json");
// Note : Sur Render gratuit, les images uploadées ici disparaîtront au redémarrage
const IMAGES_DIR = path.join(__dirname, "../public/main/images");

const ADMIN_PASSWORD = "ensc";

// --- 1. SERVIR LE SITE WEB (Frontend) ---
// Sert le dossier "public/main" (index.html, script.js...) à la racine du site
app.use(express.static(path.join(__dirname, "../public/main")));
console.log("fichier images = " + __dirname);
// Sert le dossier "public/admin" sur l'adresse /admin
app.use("/admin", express.static(path.join(__dirname, "../public/admin")));

// --- CONFIGURATION MULTER (Upload) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// --- MIDDLEWARE SÉCURITÉ ---
const requireAuth = (req, res, next) => {
  const password = req.headers["x-admin-password"];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Mot de passe incorrect" });
  }
};

// --- CHARGEMENT DONNÉES ---
let data = { toolsData: {}, quizQuestions: [] };
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("Erreur lecture JSON", e);
  }
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- ROUTES API ---

app.get("/api/data", (req, res) => {
  res.json(data);
});

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).send("Aucun fichier reçu.");
  res.json({ success: true, filename: req.file.originalname });
});

app.get("/api/images", requireAuth, (req, res) => {
  if (!fs.existsSync(IMAGES_DIR)) return res.json([]);

  fs.readdir(IMAGES_DIR, (err, files) => {
    if (err)
      return res.status(500).json({ error: "Impossible de lire le dossier" });
    const images = files.filter((file) => !file.startsWith("."));
    res.json(images);
  });
});

app.delete("/api/image/:filename", requireAuth, (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ error: "Nom de fichier invalide" });
  }

  const filePath = path.join(IMAGES_DIR, filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) return res.status(500).json({ error: "Erreur suppression" });
      res.json({ success: true });
    });
  } else {
    res.status(404).json({ error: "Fichier introuvable" });
  }
});

app.post("/api/image/rename", requireAuth, (req, res) => {
  const { oldName, newName } = req.body;

  if (!oldName || !newName || newName.includes("/") || newName.includes("..")) {
    return res.status(400).json({ error: "Noms invalides" });
  }

  const oldPath = path.join(IMAGES_DIR, oldName);
  const newPath = path.join(IMAGES_DIR, newName);

  if (!fs.existsSync(oldPath))
    return res.status(404).json({ error: "Fichier original introuvable" });
  if (fs.existsSync(newPath))
    return res
      .status(400)
      .json({ error: "Un fichier avec ce nom existe déjà" });

  fs.rename(oldPath, newPath, (err) => {
    if (err) return res.status(500).json({ error: "Erreur renommage" });
    res.json({ success: true });
  });
});

app.post("/api/theme", requireAuth, (req, res) => {
  const { key, title, description, tools } = req.body;
  data.toolsData[key] = {
    title,
    description: description || "",
    tools: tools || [],
  };
  saveData();
  res.json({ success: true, toolsData: data.toolsData });
});

app.delete("/api/theme/:key", requireAuth, (req, res) => {
  const { key } = req.params;
  if (data.toolsData[key]) {
    delete data.toolsData[key];
    saveData();
  }
  res.json({ success: true, toolsData: data.toolsData });
});

app.post("/api/question", requireAuth, (req, res) => {
  const { index, question, options, optionThemes } = req.body;
  const qData = {
    question,
    options,
    optionThemes: optionThemes || [[], [], [], []],
  };

  if (index !== undefined && data.quizQuestions[index]) {
    data.quizQuestions[index] = qData;
  } else {
    data.quizQuestions.push(qData);
  }
  saveData();
  res.json({ success: true, quizQuestions: data.quizQuestions });
});

app.delete("/api/question/:index", requireAuth, (req, res) => {
  const { index } = req.params;
  if (data.quizQuestions[index]) {
    data.quizQuestions.splice(index, 1);
    saveData();
  }
  res.json({ success: true, quizQuestions: data.quizQuestions });
});

// --- 2. DÉMARRAGE DU SERVEUR ---
// Render fournit un port via process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
