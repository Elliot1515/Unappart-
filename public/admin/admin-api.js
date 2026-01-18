// MODIFICATION IMPORTANTE : On utilise un chemin relatif (api à la racine)
const API_BASE = "/api";
let currentAuthPassword = "";

function setApiPassword(password) {
  currentAuthPassword = password;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-password": currentAuthPassword,
  };
}

async function handleResponse(response) {
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  if (!response.ok) {
    try {
      const err = await response.json();
      throw new Error(err.error || "Erreur serveur");
    } catch (e) {
      throw new Error("Erreur réseau ou serveur");
    }
  }
  return response.json();
}

const ThemeAPI = {
  async getAll() {
    const response = await fetch(`${API_BASE}/data`);
    return response.json();
  },

  async upload(formData) {
    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { "x-admin-password": currentAuthPassword },
      body: formData,
    });
    return handleResponse(response);
  },

  async getImages() {
    const response = await fetch(`${API_BASE}/images`, {
      headers: { "x-admin-password": currentAuthPassword },
    });
    return handleResponse(response);
  },

  async deleteImage(filename) {
    const response = await fetch(`${API_BASE}/image/${filename}`, {
      method: "DELETE",
      headers: { "x-admin-password": currentAuthPassword },
    });
    return handleResponse(response);
  },

  async renameImage(oldName, newName) {
    const response = await fetch(`${API_BASE}/image/rename`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ oldName, newName }),
    });
    return handleResponse(response);
  },

  async create(themeData) {
    const response = await fetch(`${API_BASE}/theme`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(themeData),
    });
    return handleResponse(response);
  },
  async update(themeData) {
    const response = await fetch(`${API_BASE}/theme`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(themeData),
    });
    return handleResponse(response);
  },
  async delete(key) {
    const response = await fetch(`${API_BASE}/theme/${key}`, {
      method: "DELETE",
      headers: { "x-admin-password": currentAuthPassword },
    });
    return handleResponse(response);
  },
};

const QuestionAPI = {
  async getAll() {
    const r = await fetch(`${API_BASE}/data`);
    const d = await r.json();
    return d.quizQuestions || [];
  },
  async create(d) {
    const r = await fetch(`${API_BASE}/question`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(d),
    });
    return handleResponse(r);
  },
  async update(d) {
    const r = await fetch(`${API_BASE}/question`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(d),
    });
    return handleResponse(r);
  },
  async delete(i) {
    const r = await fetch(`${API_BASE}/question/${i}`, {
      method: "DELETE",
      headers: { "x-admin-password": currentAuthPassword },
    });
    return handleResponse(r);
  },
};
