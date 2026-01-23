// --- VARIABLES GLOBALES ---
let appToolsData = {};
let appQuizQuestions = [];
let currentTheme = null;
let currentToolIndex = 0;
let filteredTools = [];
let themeScores = {};
let speechEnabled = false;
let textSize = 1;
let currentQuestionIndex = 0;

// --- ÉLÉMENTS DOM ---
const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".nav-button");
const toolContent = document.getElementById("toolContent");
const toolName = document.getElementById("toolName");
const foundToolButton = document.getElementById("foundTool");
const activityContent = document.getElementById("activityContent");
const activityFeedback = document.getElementById("activityFeedback");
const toggleSpeechButton = document.getElementById("toggleSpeech");
const increaseTextButton = document.getElementById("increaseText");
const decreaseTextButton = document.getElementById("decreaseText");

const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizQuestionNumber = document.getElementById("quizQuestionNumber");
const quizProgressFill = document.getElementById("quizProgressFill");

// --- CHARGEMENT DES DONNÉES ---
async function loadAppData() {
  try {
    const response = await fetch("/api/data");
    const data = await response.json();

    appToolsData = data.toolsData || {};
    appQuizQuestions = data.quizQuestions || [];

    Object.keys(appToolsData).forEach((key) => {
      themeScores[key] = 0;
    });

    updateThemeCards();
    updateSpeechIcon();
    updateTextScale();
  } catch (error) {
    console.error("Erreur de connexion à l'API :", error);
  }
}

// --- FONCTION LECTURE ÉCRAN ---
function readScreenContent() {
  if (!speechEnabled) return;
  const activeScreen = document.querySelector(".screen.active");
  if (!activeScreen) return;
  if (activeScreen.id === "quizScreen") return;

  window.speechSynthesis.cancel();

  const contentSelectors =
    "h1, h2, h3, h4, p, li, button:not(.hidden), .theme-card h3, .tag, .spec-item, img";
  const elements = activeScreen.querySelectorAll(contentSelectors);

  let textToRead = "";
  elements.forEach((el) => {
    if (el.tagName === "IMG" && el.alt) {
      textToRead += `Image : ${el.alt}. `;
    } else if (el.offsetParent !== null && el.innerText.trim() !== "") {
      let cleanText = el.innerText.replace(/\n/g, " ").trim();
      if (!cleanText.match(/[.?!]$/)) cleanText += ". ";
      else cleanText += " ";
      textToRead += cleanText;
    }
  });

  if (textToRead.length > 0) speakText(textToRead);
}

// --- QUIZ ---
function startQuiz() {
  currentQuestionIndex = 0;
  Object.keys(themeScores).forEach((key) => (themeScores[key] = 0));
  loadQuestion(currentQuestionIndex);
}

function loadQuestion(index) {
  if (index >= appQuizQuestions.length) {
    showScreen("themeSelection");
    return;
  }
  const q = appQuizQuestions[index];
  quizQuestionNumber.textContent = `Question ${index + 1} sur ${appQuizQuestions.length}`;
  quizQuestion.textContent = q.question;
  quizOptions.innerHTML = "";
  quizProgressFill.style.width = `${(index / appQuizQuestions.length) * 100}%`;

  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-button";
    btn.textContent = option;
    btn.onclick = () => handleAnswer(index, option);
    quizOptions.appendChild(btn);
  });

  if (speechEnabled) {
    window.speechSynthesis.cancel();
    let txt = q.question + ". ";
    q.options.forEach((opt, i) => (txt += `Option ${i + 1} : ${opt}. `));
    speakText(txt);
  }
}

// --- NOUVELLE FONCTION : RETOUR QUESTION PRÉCÉDENTE ---
function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion(currentQuestionIndex);
  } else {
    // Si on est à la première question, on retourne à l'accueil
    showScreen("welcomeScreen");
  }
}

function handleAnswer(questionIndex, answer) {
  const q = appQuizQuestions[questionIndex];
  const optionIndex = q.options.indexOf(answer);
  if (q.optionThemes && q.optionThemes[optionIndex]) {
    q.optionThemes[optionIndex].forEach((themeKey) => {
      if (themeScores.hasOwnProperty(themeKey)) themeScores[themeKey]++;
    });
  }
  currentQuestionIndex++;
  setTimeout(() => loadQuestion(currentQuestionIndex), 300);
}

// --- THÈMES ---
function updateThemeCards() {
  const themeContainer = document.querySelector(".theme-cards");
  if (!themeContainer) return;
  themeContainer.innerHTML = "";

  const sortedKeys = Object.keys(appToolsData).sort(
    (a, b) => (themeScores[b] || 0) - (themeScores[a] || 0),
  );
  const maxScore = Math.max(...Object.values(themeScores));

  sortedKeys.forEach((key) => {
    const theme = appToolsData[key];
    const score = themeScores[key] || 0;
    const card = document.createElement("div");
    card.className = `theme-card ${score > 0 && score === maxScore ? "best-match" : ""}`;
    card.tabIndex = 0;

    card.onclick = () => {
      currentTheme = key;
      showThemeIntroduction(key);
    };
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") card.click();
    });

    card.innerHTML = `
        <div class="theme-card-header">
            <h3>${theme.title}</h3>
            <div class="score-alignment">
                ${score > 0 && score === maxScore ? `<span class="recommanded-tag">Recommandé</span>` : ""}
                <span class="score-badge">${score} pts</span>
            </div>
        </div>`;
    themeContainer.appendChild(card);
  });
}

// --- NAVIGATION ---
function showThemeIntroduction(themeKey) {
  const theme = appToolsData[themeKey];
  const screen = document.getElementById("themeIntroduction");

  screen.innerHTML = `
        <div class="tool-content">
            <h2 class="activity-title">${theme.title}</h2>
            <p>${theme.description || ""}</p>
        </div>
        <div class="screen-navigation">
            <button class="nav-button" onclick="showScreen('themeSelection')">Retour</button>
            <button class="nav-button primary" id="startVisit">Commencer</button>
        </div>`;

  document.getElementById("startVisit").onclick = () => {
    filteredTools = theme.tools;
    currentToolIndex = 0;
    showTool(currentToolIndex);
    showScreen("toolDescription");
  };
  showScreen("themeIntroduction");
}

function showTool(index) {
  const tool = filteredTools[index];
  if (typeof tool === "object") {
    const imageHtml = tool.image
      ? `<img src="${tool.image}" alt="Photo de ${tool.name}" class="tool-image">`
      : "";
    toolContent.innerHTML = `
            <div class="tool-details">
                <h2 class="activity-title">${tool.name}</h2>
                ${imageHtml}
                <p><strong>📍 Emplacement :</strong> ${tool.location}</p>
                <div class="tool-description-section"><p>${tool.description}</p></div>
                <div class="info-box"><p><strong>💰 Prix :</strong> ${tool.price}</p></div>
            </div>`;
  }
  document.querySelector("#toolDescription .screen-navigation").innerHTML = `
        <button class="nav-button" onclick="prevTool()">Précédent</button>
        <button class="nav-button primary" id="foundTool" onclick="goToActivity()">J'ai l'outil en main</button>`;
  setTimeout(readScreenContent, 200);
}

function goToActivity() {
  const tool = filteredTools[currentToolIndex];
  if (typeof tool !== "object" || !tool.activity) {
    nextTool();
    return;
  }
  setupActivity(tool);
  showScreen("activityScreen");
}

// --- ACTIVITÉ ---
function setupActivity(tool) {
  activityContent.innerHTML = "";
  const title = document.createElement("h3");
  title.className = "activity-title";
  title.textContent = `Activité : ${tool.activity.title}`;
  activityContent.appendChild(title);

  const steps = document.createElement("div");
  steps.className = "activity-steps";
  steps.innerHTML = `<p>${tool.activity.instructions}</p>`;
  activityContent.appendChild(steps);

  const quizBox = document.createElement("div");
  quizBox.className = "quiz-box quiz-section";
  quizBox.innerHTML = `<h4>Question :</h4><p>${tool.quiz.question}</p>`;

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "quiz-options quiz-options-activity";
  (tool.quiz.options || []).forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-button";
    btn.textContent = opt;
    btn.onclick = () =>
      checkToolQuiz(opt.charAt(0), tool.quiz.correctAnswer, btn);
    optionsDiv.appendChild(btn);
  });
  quizBox.appendChild(optionsDiv);

  const feedback = document.createElement("div");
  feedback.id = "quizFeedback";
  feedback.className = "hidden quiz-feedback";
  quizBox.appendChild(feedback);
  activityContent.appendChild(quizBox);

  const nextBtn = document.getElementById("nextTool");
  if (nextBtn) {
    nextBtn.classList.remove("hidden");

    // Gestion du dernier outil pour changer le texte du bouton si nécessaire
    if (currentToolIndex >= filteredTools.length - 1) {
      nextBtn.textContent = "Voir les thèmes";
      nextBtn.onclick = () => {
        speakText("Visite terminée. Retour au menu des thèmes.");
        showScreen("themeSelection");
      };
    } else {
      nextBtn.textContent = "Outil suivant";
      nextBtn.onclick = nextTool;
    }
  }
}

function checkToolQuiz(choice, correct) {
  const feedback = document.getElementById("quizFeedback");
  const isCorrect = correct.includes(choice);
  const text = isCorrect
    ? "Bonne réponse ! "
    : `Non, la bonne réponse est ${correct}. `;
  feedback.innerHTML = `<p>${text} ${filteredTools[currentToolIndex].quiz.feedback}</p>`;
  feedback.className = `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;
  speakText(feedback.innerText);
}

function nextTool() {
  if (currentToolIndex < filteredTools.length - 1) {
    currentToolIndex++;
    showTool(currentToolIndex);
    showScreen("toolDescription");
  } else {
    speakText("Visite terminée. Retour au menu.");
    showScreen("themeSelection");
  }
}

function prevTool() {
  if (currentToolIndex > 0) {
    currentToolIndex--;
    showTool(currentToolIndex);
  } else {
    showScreen("themeIntroduction");
  }
}

function showScreen(id) {
  screens.forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "themeSelection") updateThemeCards();
  setTimeout(readScreenContent, 100);
}

// --- SYNTHÈSE VOCALE ---
function speakText(text) {
  if (!speechEnabled) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "fr-FR";
  window.speechSynthesis.speak(msg);
}

function updateSpeechIcon() {
  toggleSpeechButton.textContent = speechEnabled ? "🔊" : "🔇";
}

toggleSpeechButton.addEventListener("click", () => {
  speechEnabled = !speechEnabled;
  updateSpeechIcon();
  if (!speechEnabled) window.speechSynthesis.cancel();
  else readScreenContent();
});

// --- ZOOM TEXTE ---
function updateTextScale() {
  document.documentElement.style.setProperty("--text-scale", textSize);
  const aboutParagraph = document.querySelector(".about-section p");
  if (aboutParagraph) {
    aboutParagraph.style.fontSize = `calc(1rem * ${textSize})`;
    aboutParagraph.style.lineHeight = "1.5";
  }
}

increaseTextButton.addEventListener("click", () => {
  if (textSize < 2.5) {
    textSize = parseFloat((textSize + 0.1).toFixed(1));
    updateTextScale();
  }
});

decreaseTextButton.addEventListener("click", () => {
  if (textSize > 0.6) {
    textSize = parseFloat((textSize - 0.1).toFixed(1));
    updateTextScale();
  }
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    if (target === "quizScreen") {
      showScreen("quizScreen");
      startQuiz();
    } else if (target) showScreen(target);
  });
});

document.addEventListener("DOMContentLoaded", loadAppData);
