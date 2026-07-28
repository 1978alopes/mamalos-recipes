"use strict";

export const state = {
  recipes: [],
  currentUser: null,
  currentRole: "guest",
  currentViewId: null,
  editingRecipeId: null
};

export function canManageRecipes() {
  return state.currentRole === "family" || state.currentRole === "admin";
}

export function canDeleteRecipe(recipe) {
  if (!state.currentUser || !recipe) {
    return false;
  }

  if (state.currentRole === "admin") {
    return true;
  }

  return recipe.created_by === state.currentUser.id;
}
