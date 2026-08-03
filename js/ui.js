"use strict";

import { state, canManageRecipes } from "./state.js?v=20260803-1";

export const recipeGrid = document.getElementById("recipeGrid");
export const loadingState = document.getElementById("loadingState");
export const emptyState = document.getElementById("emptyState");
export const searchInput = document.getElementById("searchInput");
export const categoryFilter = document.getElementById("categoryFilter");
export const toast = document.getElementById("toast");

export const roleBadge = document.getElementById("roleBadge");
export const accountEmail = document.getElementById("accountEmail");
export const accountSubtext = document.getElementById("accountSubtext");
export const authBtn = document.getElementById("authBtn");
export const requestAccessBtn = document.getElementById("requestAccessBtn");
export const signOutBtn = document.getElementById("signOutBtn");
export const manageUsersBtn = document.getElementById("manageUsersBtn");
export const addBtn = document.getElementById("addBtn");
export const emptyAddBtn = document.getElementById("emptyAddBtn");

export const viewModal = document.getElementById("viewModal");
export const formModal = document.getElementById("formModal");
export const authModal = document.getElementById("authModal");
export const requestAccessModal = document.getElementById("requestAccessModal");
export const adminModal = document.getElementById("adminModal");

export const recipeForm = document.getElementById("recipeForm");
export const authForm = document.getElementById("authForm");
export const requestAccessForm = document.getElementById("requestAccessForm");

export function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

export function setModalOpen(modal, isOpen) {
  modal.classList.toggle("open", isOpen);
  modal.setAttribute("aria-hidden", String(!isOpen));
}

export function formatRole(role) {
  if (role === "admin") return "Admin";
  if (role === "family") return "Family";
  if (role === "signed_in") return "Signed In";
  if (role === "pending") return "Pending";

  return "Guest";
}

export function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function updateAccountUI() {
  roleBadge.textContent = formatRole(state.currentRole);
  roleBadge.className = `role-badge ${state.currentRole}`;

  if (!state.currentUser) {
    accountEmail.textContent = "Not signed in";
    accountSubtext.textContent = "Guests can browse family recipes.";

    authBtn.hidden = false;
    requestAccessBtn.hidden = false;
    signOutBtn.hidden = true;
    manageUsersBtn.hidden = true;
  } else {
    accountEmail.textContent =
      state.currentUser.email || "Signed-in user";

    if (state.currentRole === "admin") {
      accountSubtext.textContent =
        "You can manage recipes and user roles.";
    } else if (state.currentRole === "family") {
      accountSubtext.textContent =
        "You can add, edit, and delete your own recipes.";
    } else if (state.currentRole === "pending") {
      accountSubtext.textContent =
        "Your access request is awaiting administrator approval.";
    } else {
      accountSubtext.textContent =
        "Your account can browse recipes.";
    }

    authBtn.hidden = true;
    requestAccessBtn.hidden = true;
    signOutBtn.hidden = false;
    manageUsersBtn.hidden = state.currentRole !== "admin";
  }

  const manageRecipes = canManageRecipes();

  addBtn.hidden = !manageRecipes;
  emptyAddBtn.hidden = !manageRecipes;

  document.getElementById("editBtn").hidden = true;
  document.getElementById("deleteBtn").hidden = true;
}

export function setFormMessage(message, type = "") {
  const element = document.getElementById("recipeFormMessage");

  element.textContent = message;
  element.className = `auth-message ${type}`.trim();
}

export function setAuthMessage(message, type = "") {
  const element = document.getElementById("authMessage");

  element.textContent = message;
  element.className = `auth-message ${type}`.trim();
}

export function setRequestAccessMessage(message, type = "") {
  const element = document.getElementById("requestAccessMessage");

  element.textContent = message;
  element.className = `auth-message ${type}`.trim();
}

export function closeOnBackdrop(event, modal, closeFunction) {
  if (event.target === modal) {
    closeFunction();
  }
}
