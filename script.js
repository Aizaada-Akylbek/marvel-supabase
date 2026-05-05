import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const card = document.getElementById("card");
const btn = document.getElementById("btn");
const generateBtn = document.getElementById("generate-btn");
const searchInput = document.getElementById("search-input");
const statusMessage = document.getElementById("status");

const supabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL || window.SUPABASE_CONFIG?.url;
const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars. Check .env for VITE_SUPABASE_URL.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const MARVEL_TABLE = "characters";

let cachedMarvels = null;

function setStatus(message) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function fetchMarvels() {
  const { data, error } = await supabase
    .from(MARVEL_TABLE)
    .select("marvel_id,name,description,thumbnail_url");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function resolveImage(marvel) {
  if (marvel.thumbnail_url) return marvel.thumbnail_url;
  return "https://via.placeholder.com/200";
}

function renderMarvel(marvel) {
  const name = marvel.name || "Unknown";
  const description = marvel.description || "No description available.";
  const image = resolveImage(marvel);
  const id = marvel.marvel_id ?? "N/A";

  card.innerHTML = `
    <p class="marvel-id">
      <span>Marvel ID</span>
      ${id ?? "N/A"}
    </p>
    <img src="${image}" alt="${name}" onerror="this.src='https://via.placeholder.com/200'" />
    <h2 class="marvel-name">${name}</h2>
    <p class="marvel-description">${description}</p>
  `;

  const accent = "#e01a38";
  card.style.background = `radial-gradient(circle at 50% 0%, ${accent} 36%, #ffffff 36%)`;
}

async function generateMarvel() {
  generateBtn.disabled = true;
  generateBtn.textContent = "Loading...";
  setStatus("Loading characters...");
  try {
    if (!cachedMarvels) {
      cachedMarvels = await fetchMarvels();
    }

    if (!Array.isArray(cachedMarvels) || cachedMarvels.length === 0) {
      throw new Error("No Marvels available.");
    }

    const marvel = pickRandom(cachedMarvels);
    renderMarvel(marvel);
    setStatus("");
  } catch (error) {
    card.innerHTML = `<p class="marvel-description">${error.message}</p>`;
    setStatus("Unable to load Marvel characters.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate";
  }
}

async function searchMarvelByName(name) {
  btn.disabled = true;
  btn.textContent = "Loading...";
  setStatus("Searching...");
  try {
    if (!cachedMarvels) {
      cachedMarvels = await fetchMarvels();
    }

    if (!Array.isArray(cachedMarvels) || cachedMarvels.length === 0) {
      throw new Error("No Marvels available.");
    }

    const match = cachedMarvels.find((marvel) =>
      (marvel.name || "").toLowerCase().includes(name.toLowerCase())
    );

    if (!match) {
      throw new Error("No marvels found.");
    }

    renderMarvel(match);
    setStatus("");
  } catch (error) {
    card.innerHTML = `<p class="marvel-description">${error.message}</p>`;
    setStatus("Search failed. Try another name.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Search";
  }
}

btn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) {
    searchMarvelByName(query);
    return;
  }
  generateMarvel();
});

generateBtn.addEventListener("click", generateMarvel);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    btn.click();
  }
});

window.addEventListener("load", generateMarvel);
