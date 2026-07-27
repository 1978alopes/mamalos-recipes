import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const $ = (selector) => document.querySelector(selector);
const recipeGrid = $("#recipeGrid");
const emptyState = $("#emptyState");
const recipeDialog = $("#recipeDialog");
const viewDialog = $("#viewDialog");
const recipeForm = $("#recipeForm");
const formMessage = $("#formMessage");
const saveRecipeButton = $("#saveRecipe");
const statusText = $("#connectionStatus");

let recipes = [];
let db = null;
let onlineMode = false;

const demoRecipes = [
  {
    id: "welcome",
    title: "Add Mamalo’s First Recipe",
    contributor: "Your family",
    category: "Main Dish",
    prepTime: "Add the prep time",
    cookTime: "Add the cook time",
    servings: "Add servings",
    story: "This is a sample card. Connect Firebase using the README, then replace it by adding Mamalo’s real recipes and memories.",
    ingredients: ["Add each ingredient on its own line"],
    directions: ["Add each direction on its own line"],
    imageUrl: "",
    createdAt: Date.now()
  }
];

function validFirebaseConfig(config) {
  return config && config.apiKey && !config.apiKey.includes("PASTE_") &&
    config.projectId && !config.projectId.includes("PASTE_");
}

async function startApp() {
  const config = window.MAMALO_FIREBASE_CONFIG;
  if (!validFirebaseConfig(config)) {
    recipes = loadLocalRecipes();
    if (!recipes.length) recipes = demoRecipes;
    statusText.textContent = "Demo mode: recipes are saved only on this device.";
    renderRecipes();
    return;
  }

  try {
    const app = initializeApp(config);
    db = getFirestore(app);
    const auth = getAuth(app);
    await signInAnonymously(auth);
    onlineMode = true;
    statusText.textContent = "Connected: family recipes are shared online.";

    const recipesQuery = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
    onSnapshot(recipesQuery, (snapshot) => {
      recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderRecipes();
    }, (error) => {
      console.error(error);
      statusText.textContent = "Could not load shared recipes. Check Firebase rules.";
    });
  } catch (error) {
    console.error(error);
    recipes = loadLocalRecipes();
    if (!recipes.length) recipes = demoRecipes;
    statusText.textContent = "Offline demo mode: check your Firebase configuration.";
    renderRecipes();
  }
}

function loadLocalRecipes() {
  try {
    return JSON.parse(localStorage.getItem("mamaloRecipes") || "[]");
  } catch {
    return [];
  }
}

function saveLocalRecipes() {
  localStorage.setItem("mamaloRecipes", JSON.stringify(recipes.filter(r => r.id !== "welcome")));
}

function cleanLines(value) {
  return value.split("\n").map(line => line.trim()).filter(Boolean);
}

function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function safeImageUrl(url = "") {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function renderRecipes() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const category = $("#categoryFilter").value;

  const filtered = recipes.filter(recipe => {
    const searchable = [
      recipe.title, recipe.contributor, recipe.category, recipe.story,
      ...(recipe.ingredients || [])
    ].join(" ").toLowerCase();
    return (category === "all" || recipe.category === category) &&
      (!term || searchable.includes(term));
  });

  recipeGrid.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length > 0);

  filtered.forEach(recipe => {
    const template = $("#recipeCardTemplate").content.cloneNode(true);
    const button = template.querySelector(".card-click-area");
    const image = template.querySelector(".recipe-image");
    const imageUrl = safeImageUrl(recipe.imageUrl);

    if (imageUrl) {
      image.style.backgroundImage = `linear-gradient(0deg, rgba(30,25,20,.2), rgba(30,25,20,.05)), url("${imageUrl}")`;
      template.querySelector(".recipe-emoji").style.display = "none";
    }
    template.querySelector(".category-pill").textContent = recipe.category || "Family Recipe";
    template.querySelector(".contributor").textContent = `Shared by ${recipe.contributor || "Family"}`;
    template.querySelector("h3").textContent = recipe.title;
    template.querySelector(".story-preview").textContent = recipe.story || "A recipe worth sharing with the whole family.";

    const meta = [
      recipe.prepTime ? `Prep: ${recipe.prepTime}` : "",
      recipe.cookTime ? `Cook: ${recipe.cookTime}` : "",
      recipe.servings || ""
    ].filter(Boolean);
    template.querySelector(".recipe-meta").innerHTML = meta.map(item => `<span>${escapeHtml(item)}</span>`).join("");
    button.addEventListener("click", () => showRecipe(recipe));
    recipeGrid.appendChild(template);
  });
}

function showRecipe(recipe) {
  const imageUrl = safeImageUrl(recipe.imageUrl);
  const detail = $("#recipeDetail");
  detail.innerHTML = `
    <div class="detail-hero" ${imageUrl ? `style="background-image:linear-gradient(0deg,rgba(30,25,20,.84),rgba(30,25,20,.1)),url('${escapeHtml(imageUrl)}')"` : ""}>
      <span class="eyebrow">${escapeHtml(recipe.category || "Family Recipe")}</span>
      <h2>${escapeHtml(recipe.title)}</h2>
      <div class="detail-meta">
        <span>Shared by ${escapeHtml(recipe.contributor || "Family")}</span>
        ${recipe.prepTime ? `<span>Prep: ${escapeHtml(recipe.prepTime)}</span>` : ""}
        ${recipe.cookTime ? `<span>Cook: ${escapeHtml(recipe.cookTime)}</span>` : ""}
        ${recipe.servings ? `<span>${escapeHtml(recipe.servings)}</span>` : ""}
      </div>
    </div>
    <div class="detail-body">
      ${recipe.story ? `<p class="detail-story">${escapeHtml(recipe.story)}</p>` : ""}
      <div class="detail-columns">
        <section>
          <h3>Ingredients</h3>
          <ul>${(recipe.ingredients || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section>
          <h3>Directions</h3>
          <ol>${(recipe.directions || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </section>
      </div>
    </div>`;
  viewDialog.showModal();
}

function openRecipeDialog() {
  formMessage.textContent = "";
  recipeDialog.showModal();
}

["#openAddRecipe", "#heroAddRecipe", "#emptyAddRecipe"].forEach(selector => {
  $(selector).addEventListener("click", openRecipeDialog);
});
$("#closeDialog").addEventListener("click", () => recipeDialog.close());
$("#cancelDialog").addEventListener("click", () => recipeDialog.close());
$("#closeViewDialog").addEventListener("click", () => viewDialog.close());
$("#searchInput").addEventListener("input", renderRecipes);
$("#categoryFilter").addEventListener("change", renderRecipes);

recipeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  saveRecipeButton.disabled = true;
  saveRecipeButton.textContent = "Saving…";

  const formData = new FormData(recipeForm);
  const recipe = {
    title: formData.get("title").trim(),
    contributor: formData.get("contributor").trim(),
    category: formData.get("category"),
    prepTime: formData.get("prepTime").trim(),
    cookTime: formData.get("cookTime").trim(),
    servings: formData.get("servings").trim(),
    imageUrl: formData.get("imageUrl").trim(),
    story: formData.get("story").trim(),
    ingredients: cleanLines(formData.get("ingredients")),
    directions: cleanLines(formData.get("directions")),
    createdAt: onlineMode ? serverTimestamp() : Date.now()
  };

  try {
    if (onlineMode) {
      await addDoc(collection(db, "recipes"), recipe);
    } else {
      recipes = [{ id: crypto.randomUUID(), ...recipe }, ...recipes.filter(r => r.id !== "welcome")];
      saveLocalRecipes();
      renderRecipes();
    }
    recipeForm.reset();
    recipeDialog.close();
  } catch (error) {
    console.error(error);
    formMessage.textContent = "The recipe could not be saved. Please check the Firebase setup.";
  } finally {
    saveRecipeButton.disabled = false;
    saveRecipeButton.textContent = "Save Recipe";
  }
});

recipeDialog.addEventListener("click", event => {
  if (event.target === recipeDialog) recipeDialog.close();
});
viewDialog.addEventListener("click", event => {
  if (event.target === viewDialog) viewDialog.close();
});

startApp();
