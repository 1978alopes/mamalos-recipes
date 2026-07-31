"use strict";

import {
  state,
  canManageRecipes,
  canModifyRecipe
} from "./state.js?v=20260731-1";

import {
  recipeGrid,
  loadingState,
  emptyState,
  searchInput,
  categoryFilter,
  recipeForm,
  viewModal,
  formModal,
  showToast,
  setModalOpen,
  formatDate,
  setFormMessage
} from "./ui.js?v=20260731-1";

let shouldAnimateCards = true;
const recipeOrder = new Map();
const MAX_VISIBLE_RECIPES = 30;

function randomizeRecipes(recipes) {
  recipes.forEach(recipe => {
    if (!recipeOrder.has(recipe.id)) {
      recipeOrder.set(
        recipe.id,
        Math.random()
      );
    }
  });

  return [...recipes].sort(
    (a, b) =>
      recipeOrder.get(a.id) -
      recipeOrder.get(b.id)
  );
}

export async function loadRecipes() {
  loadingState.hidden = false;
  loadingState.textContent = "Loading recipes…";

  recipeGrid.hidden = true;
  emptyState.hidden = true;

  const { data, error } = await supabaseClient
    .from("recipes")
    .select(
      "id, title, author, category, ingredients, instructions, created_at, notes, created_by"
    )
    .order("created_at", { ascending: false });

  loadingState.hidden = true;

  if (error) {
    console.error("Could not load recipes:", error);

    loadingState.textContent =
      "Recipes could not be loaded.";

    loadingState.hidden = false;

    showToast(
      error.message ||
        "Could not load recipes."
    );

    return;
  }

  state.recipes =
    randomizeRecipes(data || []);

  populateCategoryFilter();
  renderRecipes();
}

function populateCategoryFilter() {
  const selectedCategory = categoryFilter.value;

  const categoryInput =
    document.getElementById("categoryInput");

  const categories = [
    ...new Set(
      [
        ...Array.from(categoryInput.options)
          .map(option => option.value.trim()),
        ...state.recipes
          .map(recipe => recipe.category?.trim())
      ]
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  categoryFilter.innerHTML = "";
  categoryFilter.add(new Option("All types", ""));

  categories.forEach(category => {
    categoryFilter.add(new Option(category, category));
  });

  categoryFilter.value =
    categories.includes(selectedCategory)
      ? selectedCategory
      : "";
}

export function renderRecipes() {
  const query =
    searchInput.value.trim().toLowerCase();

  const selectedCategory =
    categoryFilter.value.trim().toLowerCase();

  const filtered =
    state.recipes.filter(recipe => {
      const matchesCategory =
        !selectedCategory ||
        String(recipe.category || "")
          .trim()
          .toLowerCase() === selectedCategory;

      const matchesSearch =
        !query ||
        [
          recipe.title,
          recipe.author,
          recipe.category,
          recipe.ingredients,
          recipe.instructions,
          recipe.notes
        ]
          .filter(Boolean)
          .some(value =>
            String(value)
              .toLowerCase()
              .includes(query)
          );

      return matchesCategory && matchesSearch;
    });

  const visibleRecipes =
    filtered.slice(0, MAX_VISIBLE_RECIPES);

  recipeGrid.innerHTML = "";

  if (filtered.length === 0) {
    recipeGrid.hidden = true;
    emptyState.hidden = false;

    const emptyText =
      emptyState.querySelector("p");

    if (emptyText) {
      emptyText.textContent =
        query || selectedCategory
        ? "No recipes match your filters."
        : "No recipes have been added yet.";
    }

    return;
  }

  emptyState.hidden = true;
  recipeGrid.hidden = false;

  visibleRecipes.forEach((recipe, index) => {
    const card =
      document.createElement("article");

    card.className = "recipe-card";

    if (shouldAnimateCards) {
      card.classList.add("recipe-card-enter");
      card.style.setProperty(
        "--card-index",
        index
      );

      card.addEventListener(
        "animationend",
        () => {
          card.classList.remove("recipe-card-enter");
          card.style.removeProperty("--card-index");
        },
        { once: true }
      );
    }

    card.tabIndex = 0;

    card.setAttribute(
      "role",
      "button"
    );

    card.setAttribute(
      "aria-label",
      `Open ${recipe.title}`
    );

    const title =
      document.createElement("h3");

    title.textContent =
      recipe.title;

    const meta =
      document.createElement("div");

    meta.className = "meta";

    if (recipe.category) {
      const category =
        document.createElement("strong");

      category.className = "recipe-category";
      category.textContent = recipe.category;

      meta.append(
        category,
        ` · by ${recipe.author}`
      );
    } else {
      meta.textContent = `by ${recipe.author}`;
    }

    const preview =
      document.createElement("div");

    preview.className = "preview";

    const firstIngredient =
      String(recipe.ingredients || "")
        .split("\n")
        .find(line => line.trim()) || "";

    preview.textContent =
      firstIngredient
        ? `${firstIngredient.trim()}…`
        : "Open recipe for details";

    card.append(
      title,
      meta,
      preview
    );

    card.addEventListener(
      "click",
      () => {
        openView(recipe.id);
      }
    );

    card.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openView(recipe.id);
        }
      }
    );

    recipeGrid.appendChild(card);
  });

  shouldAnimateCards = false;
}

export function openView(id) {
  const recipe =
    state.recipes.find(
      item => item.id === id
    );

  if (!recipe) {
    return;
  }

  state.currentViewId = id;

  document
    .getElementById("viewTitle")
    .textContent =
      recipe.title;

  const dateText =
    formatDate(recipe.created_at);

  const viewMeta =
    document.getElementById("viewMeta");

  viewMeta.innerHTML = "";

  if (recipe.category) {
    const category =
      document.createElement("strong");

    category.className = "recipe-category";
    category.textContent = recipe.category;

    viewMeta.append(category, " · ");
  }

  viewMeta.append(
    dateText
      ? `Shared by ${recipe.author} · ${dateText}`
      : `Shared by ${recipe.author}`
  );

  const ingredientsList =
    document.getElementById(
      "viewIngredients"
    );

  ingredientsList.innerHTML = "";

  String(recipe.ingredients || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const item =
        document.createElement("li");

      item.textContent = line;

      ingredientsList.appendChild(item);
    });

  document
    .getElementById(
      "viewInstructions"
    )
    .textContent =
      recipe.instructions || "";

  const notesWrap =
    document.getElementById(
      "viewNotesWrap"
    );

  if (
    recipe.notes &&
    recipe.notes.trim()
  ) {
    notesWrap.hidden = false;

    document
      .getElementById("viewNotes")
      .textContent =
        recipe.notes;
  } else {
    notesWrap.hidden = true;

    document
      .getElementById("viewNotes")
      .textContent = "";
  }

document
  .getElementById("editBtn")
  .hidden =
    !canModifyRecipe(recipe);

document
  .getElementById("deleteBtn")
  .hidden =
    !canModifyRecipe(recipe);

  setModalOpen(
    viewModal,
    true
  );
}

export function closeView() {
  setModalOpen(
    viewModal,
    false
  );

  state.currentViewId = null;
}

export function openAddForm() {
  if (!canManageRecipes()) {
    showToast(
      "Family or admin access is required."
    );

    return;
  }

  state.editingRecipeId = null;

  recipeForm.reset();

  document
    .getElementById("formTitle")
    .textContent =
      "Add a Recipe";

  document
    .getElementById(
      "saveRecipeBtn"
    )
    .textContent =
      "Save Recipe";

  setFormMessage("");

  setModalOpen(
    formModal,
    true
  );

  document
    .getElementById("titleInput")
    .focus();
}

export function openEditForm() {
  if (!state.currentViewId) {
    return;
  }

  const recipe =
    state.recipes.find(
      item =>
        item.id ===
        state.currentViewId
    );

  if (!recipe) {
    return;
  }

  if (!canModifyRecipe(recipe)) {
    showToast(
      "Only the recipe creator or an admin can edit this recipe."
    );

    return;
  }

  state.editingRecipeId = recipe.id;

  document
    .getElementById("titleInput")
    .value =
      recipe.title || "";

  document
    .getElementById("authorInput")
    .value =
      recipe.author || "";

  document
    .getElementById("categoryInput")
    .value =
      recipe.category || "";

  document
    .getElementById(
      "ingredientsInput"
    )
    .value =
      recipe.ingredients || "";

  document
    .getElementById(
      "instructionsInput"
    )
    .value =
      recipe.instructions || "";

  document
    .getElementById("notesInput")
    .value =
      recipe.notes || "";

  document
    .getElementById("formTitle")
    .textContent =
      "Edit Recipe";

  document
    .getElementById(
      "saveRecipeBtn"
    )
    .textContent =
      "Save Changes";

  setFormMessage("");

  closeView();

  setModalOpen(
    formModal,
    true
  );

  document
    .getElementById("titleInput")
    .focus();
}

export function closeForm() {
  setModalOpen(
    formModal,
    false
  );

  state.editingRecipeId = null;

  setFormMessage("");
}

export async function saveRecipe(
  event
) {
  event.preventDefault();

  if (!canManageRecipes()) {
    setFormMessage(
      "Family or admin access is required.",
      "error"
    );

    return;
  }

  const title =
    document
      .getElementById("titleInput")
      .value
      .trim();

  const author =
    document
      .getElementById("authorInput")
      .value
      .trim();

  const category =
    document
      .getElementById("categoryInput")
      .value
      .trim();

  const ingredients =
    document
      .getElementById(
        "ingredientsInput"
      )
      .value
      .trim();

  const instructions =
    document
      .getElementById(
        "instructionsInput"
      )
      .value
      .trim();

  const notes =
    document
      .getElementById("notesInput")
      .value
      .trim();

  if (
    !title ||
    !author ||
    !category ||
    !ingredients ||
    !instructions
  ) {
    setFormMessage(
      "Complete all required fields.",
      "error"
    );

    return;
  }

  const saveButton =
    document.getElementById(
      "saveRecipeBtn"
    );

  saveButton.disabled = true;

  setFormMessage("Saving…");

const payload = {
  title,
  author,
  category,
  ingredients,
  instructions,
  notes
};

if (!state.editingRecipeId) {
  payload.created_by = state.currentUser.id;
}

  let result;

  if (state.editingRecipeId) {
    result =
      await supabaseClient
        .from("recipes")
        .update(payload)
        .eq(
          "id",
          state.editingRecipeId
        );
  } else {
    result =
      await supabaseClient
        .from("recipes")
        .insert(payload);
  }

  saveButton.disabled = false;

  if (result.error) {
    console.error(
      "Could not save recipe:",
      result.error
    );

    setFormMessage(
      result.error.message ||
        "The recipe could not be saved.",
      "error"
    );

    return;
  }

  const wasEditing =
    Boolean(
      state.editingRecipeId
    );

  closeForm();

  searchInput.value = "";
  categoryFilter.value = "";

  await loadRecipes();

  showToast(
    wasEditing
      ? "Recipe updated."
      : "Recipe added — thank you!"
  );
}

export async function deleteCurrent() {
  if (!state.currentViewId) {
    return;
  }

  const recipe =
    state.recipes.find(
      item =>
        item.id ===
        state.currentViewId
    );

  if (!recipe) {
    return;
  }

  if (!canModifyRecipe(recipe)) {
    showToast(
      "Only the recipe creator or an admin can delete this recipe."
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${recipe.title}"? This cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  const recipeId =
    state.currentViewId;

  const deleteButton =
    document.getElementById(
      "deleteBtn"
    );

  deleteButton.disabled = true;

  const { error } =
    await supabaseClient
      .from("recipes")
      .delete()
      .eq(
        "id",
        recipeId
      );

  deleteButton.disabled = false;

  if (error) {
    console.error(
      "Could not delete recipe:",
      error
    );

    showToast(
      error.message ||
        "The recipe could not be deleted."
    );

    return;
  }

  closeView();

  await loadRecipes();

  showToast("Recipe deleted.");
}
