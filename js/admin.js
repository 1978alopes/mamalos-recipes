"use strict";

import { state } from "./state.js?v=20260803-1";

import {
  adminModal,
  showToast,
  setModalOpen,
  formatDate,
  formatRole
} from "./ui.js?v=20260803-1";

import {
  refreshSessionAndRole
} from "./auth.js?v=20260803-1";

export async function openAdminPanel() {
  if (state.currentRole !== "admin") {
    showToast(
      "Admin access is required."
    );

    return;
  }

  setModalOpen(
    adminModal,
    true
  );

  await loadAdminUsers();
}

export function closeAdminPanel() {
  setModalOpen(
    adminModal,
    false
  );
}

export async function loadAdminUsers() {
  const loading =
    document.getElementById(
      "adminLoading"
    );

  const list =
    document.getElementById(
      "userList"
    );

  const message =
    document.getElementById(
      "adminMessage"
    );

  loading.hidden = false;
  list.hidden = true;
  list.innerHTML = "";

  message.textContent = "";
  message.className =
    "auth-message";

  const { data, error } =
    await supabaseClient.rpc(
      "admin_list_access_users"
    );

  loading.hidden = true;

  if (error) {
    console.error(
      "Could not list users:",
      error
    );

    message.textContent =
      error.message ||
      "Users could not be loaded.";

    message.className =
      "auth-message error";

    return;
  }

  (data || []).forEach(user => {
    const row =
      document.createElement("div");

    row.className = "user-row";

    const details =
      document.createElement("div");

    const email =
      document.createElement("div");

    email.className =
      "user-email";

    email.textContent =
      user.email ||
      "(No email)";

    const created =
      document.createElement("div");

    created.className =
      "user-created";

    const isPending =
      !user.role;

    created.textContent =
      `${isPending ? "Requested access" : "Joined"} ${
        formatDate(
          user.created_at
        ) || "unknown date"
      }${isPending ? " · Pending approval" : ""}`;

    details.append(
      email,
      created
    );

    const select =
      document.createElement(
        "select"
      );

    select.setAttribute(
      "aria-label",
      `Role for ${
        user.email || "user"
      }`
    );

    if (isPending) {
      const pendingOption =
        document.createElement("option");

      pendingOption.value = "";
      pendingOption.textContent = "Pending approval";
      pendingOption.selected = true;
      pendingOption.disabled = true;

      select.appendChild(pendingOption);
    }

    [
      [
        "signed_in",
        "Signed In"
      ],
      [
        "family",
        "Family"
      ],
      [
        "admin",
        "Admin"
      ]
    ].forEach(
      ([value, label]) => {
        const option =
          document.createElement(
            "option"
          );

        option.value = value;
        option.textContent =
          label;

        option.selected =
          user.role === value;

        select.appendChild(
          option
        );
      }
    );

    select.addEventListener(
      "change",
      async () => {
        const previousRole =
          user.role;

        const newRole =
          select.value;

        if (!newRole) {
          return;
        }

        select.disabled = true;

        const {
          error: updateError
        } =
          await supabaseClient.rpc(
            "admin_set_user_role",
            {
              target_user_id:
                user.user_id,

              new_role:
                newRole
            }
          );

        select.disabled = false;

        if (updateError) {
          console.error(
            "Could not change role:",
            updateError
          );

          select.value =
            previousRole || "";

          message.textContent =
            updateError.message ||
            "The user's role could not be changed.";

          message.className =
            "auth-message error";

          return;
        }

        user.role = newRole;

        message.textContent =
          `${
            user.email || "User"
          } is now ${
            formatRole(newRole)
          }.`;

        message.className =
          "auth-message success";

        if (
          user.user_id ===
          state.currentUser?.id
        ) {
          await refreshSessionAndRole();

          if (
            state.currentRole !==
            "admin"
          ) {
            closeAdminPanel();

            showToast(
              "Your role was changed."
            );
          }
        }
      }
    );

    row.append(
      details,
      select
    );

    list.appendChild(row);
  });

  list.hidden = false;
}
