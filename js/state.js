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
