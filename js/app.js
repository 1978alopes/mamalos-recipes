"use strict";

import {
  addBtn,
  emptyAddBtn,
  authBtn,
  signOutBtn,
  manageUsersBtn,
  recipeForm,
  authForm,
  searchInput,
  categoryFilter,
  viewModal,
  formModal,
  authModal,
  adminModal,
  loadingState,
  closeOnBackdrop,
  setModalOpen
} from "./ui.js?v=20260730";

import {
  isConfigured,
  refreshSessionAndRole,
  openAuth,
  closeAuth,
  submitAuth,
  signOut,
  listenForAuthChanges
} from "./auth.js?v=20260730";

import {
  loadRecipes,
  renderRecipes,
  openAddForm,
  openEditForm,
  closeView,
  closeForm,
  saveRecipe,
  deleteCurrent
} from "./recipes.js?v=20260730";

import {
  openAdminPanel,
  closeAdminPanel,
  loadAdminUsers
} from "./admin.js?v=20260730";

function bindEvents() {
  addBtn.addEventListener(
    "click",
    openAddForm
  );

  emptyAddBtn.addEventListener(
    "click",
    openAddForm
  );

  document
    .getElementById("viewClose")
    .addEventListener(
      "click",
      closeView
    );

  document
    .getElementById("viewCloseBtn")
    .addEventListener(
      "click",
      closeView
    );

  document
    .getElementById("editBtn")
    .addEventListener(
      "click",
      openEditForm
    );

  document
    .getElementById("deleteBtn")
    .addEventListener(
      "click",
      deleteCurrent
    );

  document
    .getElementById("formClose")
    .addEventListener(
      "click",
      closeForm
    );

  document
    .getElementById("formCancel")
    .addEventListener(
      "click",
      closeForm
    );

  recipeForm.addEventListener(
    "submit",
    saveRecipe
  );

  authBtn.addEventListener(
    "click",
    openAuth
  );

  signOutBtn.addEventListener(
    "click",
    async () => {
      closeView();
      closeForm();

      setModalOpen(
        adminModal,
        false
      );

      await signOut();
    }
  );

  document
    .getElementById("authClose")
    .addEventListener(
      "click",
      closeAuth
    );

  document
    .getElementById("authCancel")
    .addEventListener(
      "click",
      closeAuth
    );

  authForm.addEventListener(
    "submit",
    submitAuth
  );

  manageUsersBtn.addEventListener(
    "click",
    openAdminPanel
  );

  document
    .getElementById("adminClose")
    .addEventListener(
      "click",
      closeAdminPanel
    );

  document
    .getElementById("adminCloseBtn")
    .addEventListener(
      "click",
      closeAdminPanel
    );

  document
    .getElementById("refreshUsersBtn")
    .addEventListener(
      "click",
      loadAdminUsers
    );

  searchInput.addEventListener(
    "input",
    renderRecipes
  );

  categoryFilter.addEventListener(
    "change",
    renderRecipes
  );

  viewModal.addEventListener(
    "click",
    event => {
      closeOnBackdrop(
        event,
        viewModal,
        closeView
      );
    }
  );

  formModal.addEventListener(
    "click",
    event => {
      closeOnBackdrop(
        event,
        formModal,
        closeForm
      );
    }
  );

  authModal.addEventListener(
    "click",
    event => {
      closeOnBackdrop(
        event,
        authModal,
        closeAuth
      );
    }
  );

  adminModal.addEventListener(
    "click",
    event => {
      closeOnBackdrop(
        event,
        adminModal,
        closeAdminPanel
      );
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      if (
        adminModal.classList.contains(
          "open"
        )
      ) {
        closeAdminPanel();
      } else if (
        authModal.classList.contains(
          "open"
        )
      ) {
        closeAuth();
      } else if (
        formModal.classList.contains(
          "open"
        )
      ) {
        closeForm();
      } else if (
        viewModal.classList.contains(
          "open"
        )
      ) {
        closeView();
      }
    }
  );
}

async function init() {
  bindEvents();

  if (!isConfigured()) {
    loadingState.textContent =
      "Setup required: paste your Supabase publishable key into js/config.js.";

    authBtn.disabled = true;

    return;
  }

  listenForAuthChanges();

  await refreshSessionAndRole();
  await loadRecipes();
}

init().catch(error => {
  console.error(
    "App initialization failed:",
    error
  );

  loadingState.textContent =
    "The website could not be initialized.";

  loadingState.hidden = false;
});
