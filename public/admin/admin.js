// admin.js - Version Finale avec Feedback Renommage & Zone Quiz Agrandie
let toolsData = {};
let quizQuestions = [];
let currentEditingQuestionIndex = null;
let currentEditingOptionIndex = null;

// ============================================================
// 1. UTILITAIRES & SÉCURITÉ (EN PREMIER)
// ============================================================

// Affiche les messages (Vert = Succès, Rouge = Erreur, Orange = Info/Warning)
function showNotification(msg, type = "success") {
  let notif = document.querySelector(".notification");
  if (!notif) {
    notif = document.createElement("div");
    notif.className = "notification";
    document.body.appendChild(notif);
  }
  notif.textContent = msg;

  if (type === "error") {
    notif.style.backgroundColor = "#dc3545"; // Rouge
  } else if (type === "warning") {
    notif.style.backgroundColor = "#ff9800"; // Orange
  } else {
    notif.style.backgroundColor = "#28a745"; // Vert
  }

  notif.style.display = "block";
  notif.style.opacity = "1";

  setTimeout(() => {
    notif.style.display = "none";
  }, 3000);
}

// Demande le mot de passe
function requestPassword() {
  const password = prompt(
    "🔒 ACTION PROTÉGÉE\nVeuillez entrer le mot de passe administrateur :",
  );
  if (password === null || password.trim() === "") return false;

  setApiPassword(password);
  return true;
}

// Gère les erreurs serveur
function handleApiError(error) {
  console.error("Erreur API:", error);
  if (error.message === "AUTH_REQUIRED") {
    showNotification("⛔ Mot de passe incorrect !", "error");
  } else {
    showNotification(error.message || "Erreur technique", "error");
  }
}

// Gestion des onglets
function switchTab(name) {
  const themesView = document.getElementById("view-themes");
  const quizView = document.getElementById("view-quiz");

  if (themesView && quizView) {
    themesView.style.display = name === "themes" ? "block" : "none";
    quizView.style.display = name === "themes" ? "none" : "block";

    document
      .querySelectorAll(".tab-button")
      .forEach((b) => b.classList.remove("active"));
    const btnIndex = name === "themes" ? 0 : 1;
    const buttons = document.querySelectorAll(".tab-button");
    if (buttons[btnIndex]) buttons[btnIndex].classList.add("active");
  }
}

// ============================================================
// 2. GESTION DES IMAGES (MÉDIATHÈQUE)
// ============================================================

async function loadImages() {
  const container = document.getElementById("adminImagesGrid");
  if (!container) return;

  if (container.children.length === 0)
    container.innerHTML = "<p>Chargement...</p>";

  try {
    const images = await ThemeAPI.getImages();
    renderImagesGrid(images);
  } catch (error) {
    container.innerHTML = `
            <div style="text-align:center; padding: 20px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; color: #856404;">
                <p style="margin:0 0 10px 0;">🔒 <strong>Galerie protégée</strong></p>
                <button onclick="window.unlockGallery()" class="primary-button small-button" style="background-color:#e0a800; border:none;">🔑 Saisir le mot de passe pour afficher</button>
            </div>
        `;
  }
}

function unlockGallery() {
  if (requestPassword()) {
    loadImages();
    showNotification("Accès autorisé !");
  }
}

function renderImagesGrid(images) {
  const container = document.getElementById("adminImagesGrid");
  container.innerHTML = "";

  if (!images || images.length === 0) {
    container.innerHTML = "<p>Aucune image disponible.</p>";
    return;
  }

  images.forEach((filename) => {
    const div = document.createElement("div");
    div.style.cssText =
      "border: 1px solid #ddd; padding: 10px; background: #fff; border-radius: 6px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";

    const imagePath = `../main/images/${filename}`;

    div.innerHTML = `
            <div style="height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; background: #f9f9f9; border-radius: 4px;">
                <img src="${imagePath}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
            <div style="margin-bottom: 8px;">
                <input type="text" value="${filename}" id="rename-${filename}" style="width: 100%; font-size: 0.85em; text-align: center; border: 1px solid #eee; padding: 4px; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 5px; justify-content: center;">
                <button onclick="window.tryRenameImage('${filename}')" class="secondary-button small-button" style="padding: 4px 8px; font-size: 0.8em;" title="Sauvegarder le nom">💾</button>
                <button onclick="window.tryDeleteImage('${filename}')" class="danger-button small-button" style="padding: 4px 8px; font-size: 0.8em;" title="Supprimer">🗑️</button>
            </div>
        `;
    container.appendChild(div);
  });
}

async function uploadImage() {
  const fileInput = document.getElementById("imageUploadInput");
  if (!fileInput || fileInput.files.length === 0)
    return showNotification("Sélectionnez une image", "error");

  if (!requestPassword()) return;

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);

  try {
    await ThemeAPI.upload(formData);
    showNotification(`Image envoyée !`);
    fileInput.value = "";
    loadImages();
  } catch (error) {
    handleApiError(error);
  }
}

async function tryDeleteImage(filename) {
  if (!confirm(`Supprimer définitivement "${filename}" ?`)) return;
  if (!requestPassword()) return;

  try {
    await ThemeAPI.deleteImage(filename);
    showNotification("Image supprimée");
    loadImages();
  } catch (error) {
    handleApiError(error);
  }
}

async function tryRenameImage(oldName) {
  const input = document.getElementById(`rename-${oldName}`);
  const newName = input.value.trim();

  // FEEDBACK SI RIEN N'A CHANGÉ
  if (newName === oldName) {
    return showNotification("Aucune modification détectée.", "warning");
  }

  if (!newName) return showNotification("Nom vide interdit", "error");
  if (!requestPassword()) return;

  try {
    await ThemeAPI.renameImage(oldName, newName);
    showNotification("Image renommée !");
    loadImages();
  } catch (error) {
    handleApiError(error);
    input.value = oldName;
  }
}

// ============================================================
// 3. CHARGEMENT DONNÉES & RENDU
// ============================================================

async function loadData() {
  try {
    const data = await ThemeAPI.getAll();
    toolsData = data.toolsData || {};
    quizQuestions = data.quizQuestions || [];
    renderThemes();
    renderQuestions();
    setupModalEvents();

    // Tente de charger les images (affichera le bouton cadenas si échec)
    loadImages();
  } catch (error) {
    console.error("Erreur chargement:", error);
    showNotification("Erreur de connexion au serveur", "error");
  }
}

function renderThemes() {
  const container = document.getElementById("adminThemesList");
  container.innerHTML = "";

  Object.entries(toolsData).forEach(([key, theme]) => {
    const themeDiv = document.createElement("div");
    themeDiv.className = "theme-item";

    let toolsHtml = "";
    if (theme.tools && theme.tools.length > 0) {
      toolsHtml = theme.tools
        .map((tool, index) => {
          const toolName =
            typeof tool === "object" && tool.name
              ? tool.name
              : "Outil sans nom";
          return `
                <div class="tool-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center; background: #fff; padding: 8px; border: 1px solid #eee; border-radius: 4px;">
                    <span style="flex: 1; font-weight:500;">${toolName}</span>
                    <button onclick="window.openToolModal('${key}', ${index})" class="secondary-button small-button">Modifier</button>
                    <button onclick="window.deleteTool('${key}', ${index})" class="danger-button small-button">Supprimer</button>
                </div>`;
        })
        .join("");
    } else {
      toolsHtml = "<p style='color:#666; font-style:italic;'>Aucun outil.</p>";
    }

    themeDiv.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>Thème : </strong>
                <input type="text" value="${theme.title}" id="theme-${key}" class="full-width-input" style="margin-top:5px;">
            </div>
            <div style="margin-bottom: 10px;">
                <textarea id="desc-${key}" class="full-width-input" rows="2">${theme.description || ""}</textarea>
            </div>
            <div style="background: #f1f3f5; padding: 15px; border-radius: 6px;">
                <label style="font-weight:bold; color: #333; display:block; margin-bottom:10px;">Outils :</label>
                ${toolsHtml}
                <div style="margin-top: 15px; text-align: right;">
                    <button onclick="window.addTool('${key}')" class="primary-button small-button">+ Ajouter outil</button>
                </div>
            </div>
            <div class="question-actions">
                <button onclick="window.updateTheme('${key}')" class="primary-button">Enregistrer Thème</button>
                <button onclick="window.deleteTheme('${key}')" class="danger-button">Supprimer Thème</button>
            </div>
        `;
    container.appendChild(themeDiv);
  });
}

function renderQuestions() {
  const container = document.getElementById("adminQuestionsList");
  container.innerHTML = "";

  if (quizQuestions.length === 0) {
    container.innerHTML = '<p style="text-align: center;">Aucune question.</p>';
    return;
  }

  quizQuestions.forEach((question, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-item";
    questionDiv.id = `question-${index}`;

    questionDiv.innerHTML = `
            <div class="question-header">
                <h3>Question ${index + 1}:</h3>
                <textarea id="question-text-${index}" class="full-width-input" rows="2">${question.question}</textarea>
            </div>
            <div class="question-options">
                ${question.options
                  .map(
                    (option, optIndex) => `
                    <div class="option-edit-group">
                        <label>Option ${optIndex + 1}:</label>
                        <input type="text" id="question-${index}-option-${optIndex}" class="option-edit-input" value="${option}">
                        <button onclick="openThemeModal(${index}, ${optIndex})" class="secondary-button small-button">Lier Thèmes</button>
                    </div>
                `,
                  )
                  .join("")}
            </div>
            <div class="question-actions">
                <button onclick="updateQuestion(${index})" class="primary-button">Enregistrer</button>
                <button onclick="deleteQuestion(${index})" class="danger-button">Supprimer</button>
            </div>
        `;
    container.appendChild(questionDiv);
  });
}

// ============================================================
// 4. ACTIONS (THEMES & QUESTIONS)
// ============================================================

const addThemeBtn = document.getElementById("addThemeBtn");
if (addThemeBtn) {
  addThemeBtn.addEventListener("click", async () => {
    const name = document.getElementById("newThemeName").value.trim();
    const desc = document.getElementById("newThemeDescription").value.trim();
    if (!name) return showNotification("Nom requis", "error");
    if (!requestPassword()) return;

    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    try {
      await ThemeAPI.create({ key, title: name, description: desc, tools: [] });
      document.getElementById("newThemeName").value = "";
      document.getElementById("newThemeDescription").value = "";
      loadData();
      showNotification("Thème ajouté !");
    } catch (error) {
      handleApiError(error);
    }
  });
}

async function updateTheme(key) {
  if (!requestPassword()) return;
  const title = document.getElementById(`theme-${key}`).value;
  const description = document.getElementById(`desc-${key}`).value;
  const tools = toolsData[key].tools || [];

  try {
    await ThemeAPI.update({ key, title, description, tools });
    loadData();
    showNotification("Thème enregistré !");
  } catch (error) {
    handleApiError(error);
  }
}

async function deleteTheme(key) {
  if (!confirm("Supprimer ce thème ?")) return;
  if (!requestPassword()) return;
  try {
    await ThemeAPI.delete(key);
    loadData();
    showNotification("Thème supprimé !");
  } catch (error) {
    handleApiError(error);
  }
}

const addQuestionBtn = document.getElementById("addQuestionBtn");
if (addQuestionBtn) {
  addQuestionBtn.addEventListener("click", async () => {
    const question = document.getElementById("newQuestionText").value.trim();
    if (!requestPassword()) return;
    try {
      await QuestionAPI.create({
        question,
        options: ["", "", "", ""],
        optionThemes: [[], [], [], []],
      });
      document.getElementById("newQuestionText").value = "";
      loadData();
      showNotification("Question ajoutée !");
    } catch (e) {
      handleApiError(e);
    }
  });
}

async function updateQuestion(index) {
  if (!requestPassword()) return;
  const qText = document.getElementById(`question-text-${index}`).value;
  const opts = [];
  for (let i = 0; i < 4; i++) {
    opts.push(document.getElementById(`question-${index}-option-${i}`).value);
  }

  const q = quizQuestions[index];
  try {
    await QuestionAPI.update({
      index,
      question: qText,
      options: opts,
      optionThemes: q.optionThemes,
    });
    renderQuestions();
    showNotification("Question mise à jour !");
  } catch (e) {
    handleApiError(e);
  }
}

async function deleteQuestion(index) {
  if (!confirm("Supprimer ?")) return;
  if (!requestPassword()) return;
  try {
    await QuestionAPI.delete(index);
    loadData();
    showNotification("Question supprimée");
  } catch (e) {
    handleApiError(e);
  }
}

// ============================================================
// 5. LOGIQUE OUTILS
// ============================================================

async function addTool(themeKey) {
  if (!requestPassword()) return;
  const newTool = { name: "Nouvel outil", image: "", description: "" };
  if (!toolsData[themeKey].tools) toolsData[themeKey].tools = [];
  toolsData[themeKey].tools.push(newTool);

  try {
    await ThemeAPI.update({
      key: themeKey,
      title: toolsData[themeKey].title,
      description: toolsData[themeKey].description,
      tools: toolsData[themeKey].tools,
    });
    renderThemes();
    openToolModal(themeKey, toolsData[themeKey].tools.length - 1);
  } catch (e) {
    handleApiError(e);
  }
}

async function deleteTool(themeKey, toolIndex) {
  if (!confirm("Supprimer cet outil ?")) return;
  if (!requestPassword()) return;
  toolsData[themeKey].tools.splice(toolIndex, 1);
  try {
    await ThemeAPI.update({
      key: themeKey,
      title: toolsData[themeKey].title,
      description: toolsData[themeKey].description,
      tools: toolsData[themeKey].tools,
    });
    renderThemes();
    showNotification("Outil supprimé");
  } catch (e) {
    handleApiError(e);
  }
}

// Modale Outil
let editingThemeKey = null,
  editingToolIndex = null;

function openToolModal(key, idx) {
  editingThemeKey = key;
  editingToolIndex = idx;
  const tool = toolsData[key].tools[idx];
  const d = typeof tool === "object" ? tool : { name: tool };

  document.getElementById("toolName").value = d.name || "";

  // Gestion affichage image (enlève ./images/)
  let imgVal = d.image || "";
  if (imgVal.startsWith("./images/")) imgVal = imgVal.replace("./images/", "");
  document.getElementById("toolImageName").value = imgVal;

  document.getElementById("toolLocation").value = d.location || "";
  document.getElementById("toolPrice").value = d.price || "";
  document.getElementById("toolDescription").value = d.description || "";

  const act = d.activity || {};
  document.getElementById("toolActivityTitle").value = act.title || "";
  document.getElementById("toolActivityInstructions").value =
    act.instructions || "";

  const q = d.quiz || {};
  document.getElementById("toolQuizQuestion").value = q.question || "";
  document.getElementById("toolQuizOptions").value = (q.options || []).join(
    ", ",
  );
  document.getElementById("toolQuizAnswer").value = q.correctAnswer || "";
  document.getElementById("toolQuizFeedback").value = q.feedback || "";

  document.getElementById("toolEditModal").style.display = "block";
}

function closeToolModal() {
  document.getElementById("toolEditModal").style.display = "none";
  editingThemeKey = null;
}

async function saveToolData() {
  if (editingThemeKey === null || editingToolIndex === null) return;
  if (!requestPassword()) return;

  const rawImg = document.getElementById("toolImageName").value.trim();
  const finalImg = rawImg ? `./images/${rawImg}` : "";

  const updatedTool = {
    id: toolsData[editingThemeKey].tools[editingToolIndex].id || "",
    name: document.getElementById("toolName").value,
    image: finalImg,
    location: document.getElementById("toolLocation").value,
    price: document.getElementById("toolPrice").value,
    description: document.getElementById("toolDescription").value,
    activity: {
      title: document.getElementById("toolActivityTitle").value,
      instructions: document.getElementById("toolActivityInstructions").value,
    },
    quiz: {
      question: document.getElementById("toolQuizQuestion").value,
      options: document
        .getElementById("toolQuizOptions")
        .value.split(",")
        .map((o) => o.trim())
        .filter((o) => o),
      correctAnswer: document.getElementById("toolQuizAnswer").value,
      feedback: document.getElementById("toolQuizFeedback").value,
    },
  };

  toolsData[editingThemeKey].tools[editingToolIndex] = updatedTool;

  try {
    await ThemeAPI.update({
      key: editingThemeKey,
      title: toolsData[editingThemeKey].title,
      description: toolsData[editingThemeKey].description,
      tools: toolsData[editingThemeKey].tools,
    });
    showNotification("Outil sauvegardé !");
    closeToolModal();
    renderThemes();
  } catch (e) {
    handleApiError(e);
  }
}

// ============================================================
// 6. MODALE LIAISON THÈMES
// ============================================================

function setupModalEvents() {
  const modal = document.getElementById("themeModal");
  if (!modal) return;
  modal.querySelector(".close-button").onclick = () =>
    (modal.style.display = "none");
  document.getElementById("cancelThemesBtn").onclick = () =>
    (modal.style.display = "none");
  document.getElementById("saveThemesBtn").onclick = saveThemesForOption;
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

function openThemeModal(questionIndex, optionIndex) {
  currentEditingQuestionIndex = questionIndex;
  currentEditingOptionIndex = optionIndex;
  const q = quizQuestions[questionIndex];
  const themes =
    q.optionThemes && q.optionThemes[optionIndex]
      ? q.optionThemes[optionIndex]
      : [];

  document.getElementById("modalThemeTitle").textContent =
    `Lier Thèmes pour : "${q.options[optionIndex]}"`;
  const container = document.getElementById("modalThemeSelection");
  container.innerHTML = "";

  Object.entries(toolsData).forEach(([key, theme]) => {
    const label = document.createElement("label");
    label.style.display = "block";
    label.style.padding = "5px";
    label.innerHTML = `<input type="checkbox" value="${key}" ${themes.includes(key) ? "checked" : ""}> ${theme.title}`;
    container.appendChild(label);
  });
  document.getElementById("themeModal").style.display = "block";
}

async function saveThemesForOption() {
  if (!requestPassword()) return;
  const checkboxes = document.querySelectorAll(
    '#modalThemeSelection input[type="checkbox"]',
  );
  const selected = Array.from(checkboxes)
    .filter((c) => c.checked)
    .map((c) => c.value);

  if (!quizQuestions[currentEditingQuestionIndex].optionThemes)
    quizQuestions[currentEditingQuestionIndex].optionThemes = [[], [], [], []];
  quizQuestions[currentEditingQuestionIndex].optionThemes[
    currentEditingOptionIndex
  ] = selected;

  try {
    const q = quizQuestions[currentEditingQuestionIndex];
    await QuestionAPI.update({
      index: currentEditingQuestionIndex,
      question: q.question,
      options: q.options,
      optionThemes: q.optionThemes,
    });
    document.getElementById("themeModal").style.display = "none";
    renderQuestions();
    showNotification("Liaison sauvegardée !");
  } catch (e) {
    handleApiError(e);
  }
}

// ============================================================
// 7. INITIALISATION
// ============================================================

document.addEventListener("DOMContentLoaded", loadData);

// Export des fonctions
window.uploadImage = uploadImage;
window.tryDeleteImage = tryDeleteImage;
window.tryRenameImage = tryRenameImage;
window.openToolModal = openToolModal;
window.closeToolModal = closeToolModal;
window.saveToolData = saveToolData;
window.addTool = addTool;
window.deleteTool = deleteTool;
window.updateTheme = updateTheme;
window.deleteTheme = deleteTheme;
window.openThemeModal = openThemeModal;
window.updateQuestion = updateQuestion;
window.deleteQuestion = deleteQuestion;
window.switchTab = switchTab;
window.unlockGallery = unlockGallery;
