"use strict";

import {
  addBtn,
  emptyAddBtn,
  authBtn,
  requestAccessBtn,
  signOutBtn,
  manageUsersBtn,
  recipeForm,
  authForm,
  requestAccessForm,
  searchInput,
  categoryFilter,
  viewModal,
  formModal,
  authModal,
  requestAccessModal,
  adminModal,
  loadingState,
  closeOnBackdrop,
  setModalOpen
} from "./ui.js?v=20260803-1";

import {
  isConfigured,
  refreshSessionAndRole,
  openAuth,
  closeAuth,
  openRequestAccess,
  closeRequestAccess,
  submitAccessRequest,
  submitAuth,
  signOut,
  listenForAuthChanges
} from "./auth.js?v=20260803-1";

import {
  loadRecipes,
  renderRecipes,
  initializeRecipeLoading,
  openAddForm,
  openEditForm,
  closeView,
  closeForm,
  saveRecipe,
  deleteCurrent
} from "./recipes.js?v=20260803-1";

import {
  openAdminPanel,
  closeAdminPanel,
  loadAdminUsers
} from "./admin.js?v=20260803-1";

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

  requestAccessBtn.addEventListener(
    "click",
    openRequestAccess
  );

  document
    .getElementById("requestAccessClose")
    .addEventListener(
      "click",
      closeRequestAccess
    );

  document
    .getElementById("requestAccessCancel")
    .addEventListener(
      "click",
      closeRequestAccess
    );

  requestAccessForm.addEventListener(
    "submit",
    submitAccessRequest
  );

  signOutBtn.addEventListener(
    "click",
    async () => {
      closeView();
      closeForm();
      closeRequestAccess();

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

  requestAccessModal.addEventListener(
    "click",
    event => {
      closeOnBackdrop(
        event,
        requestAccessModal,
        closeRequestAccess
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
        requestAccessModal.classList.contains(
          "open"
        )
      ) {
        closeRequestAccess();
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
  initializeRecipeLoading();

  if (!isConfigured()) {
    loadingState.textContent =
      "Setup required: paste your Supabase publishable key into js/config.js.";

    authBtn.disabled = true;
    requestAccessBtn.disabled = true;

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
