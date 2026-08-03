"use strict";

import { state } from "./state.js?v=20260803-1";

import {
  authForm,
  authModal,
  requestAccessForm,
  requestAccessModal,
  showToast,
  setModalOpen,
  setAuthMessage,
  setRequestAccessMessage,
  updateAccountUI
} from "./ui.js?v=20260803-1";

export function isConfigured() {
  return (
    typeof SUPABASE_PUBLISHABLE_KEY === "string" &&
    SUPABASE_PUBLISHABLE_KEY.trim() !== "" &&
    SUPABASE_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY_HERE"
  );
}

export async function refreshSessionAndRole() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Could not read session:", error);
  }

  state.currentUser = session?.user ?? null;
  state.currentRole = "guest";

  if (state.currentUser) {
    const { data, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", state.currentUser.id)
      .maybeSingle();

    if (roleError) {
      console.error("Could not load role:", roleError);

      showToast(
        "Signed in, but the account role could not be loaded."
      );

      state.currentRole = "signed_in";
    } else {
      state.currentRole = data?.role || "pending";
    }
  }

  updateAccountUI();
}

export function openAuth() {
  closeRequestAccess();
  authForm.reset();

  setAuthMessage("");
  setModalOpen(authModal, true);

  document.getElementById("emailInput").focus();
}

export function closeAuth() {
  setModalOpen(authModal, false);
  setAuthMessage("");
}

export function openRequestAccess() {
  closeAuth();
  requestAccessForm.reset();

  setRequestAccessMessage("");
  setModalOpen(requestAccessModal, true);

  document.getElementById("requestEmailInput").focus();
}

export function closeRequestAccess() {
  setModalOpen(requestAccessModal, false);
  setRequestAccessMessage("");
}

export async function submitAccessRequest(event) {
  event.preventDefault();

  const email =
    document.getElementById("requestEmailInput").value.trim();

  const password =
    document.getElementById("requestPasswordInput").value;

  const passwordConfirmation =
    document.getElementById("requestPasswordConfirmInput").value;

  const submitButton =
    document.getElementById("requestAccessSubmitBtn");

  if (!email || !password) {
    setRequestAccessMessage(
      "Enter your email and password.",
      "error"
    );

    return;
  }

  if (password !== passwordConfirmation) {
    setRequestAccessMessage(
      "The passwords do not match.",
      "error"
    );

    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";

  setRequestAccessMessage("Submitting your request…");

  try {
    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (data.session) {
      await supabaseClient.auth.signOut();
    }

    requestAccessForm.reset();

    setRequestAccessMessage(
      "Request received. Check your email if verification is required. An administrator must approve your account before you can sign in.",
      "success"
    );
  } catch (error) {
    console.error("Access request failed:", error);

    setRequestAccessMessage(
      error.message || "Your access request could not be submitted.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Request";
  }
}

export async function submitAuth(event) {
  event.preventDefault();

  const email =
    document.getElementById("emailInput").value.trim();

  const password =
    document.getElementById("passwordInput").value;

  const submitButton =
    document.getElementById("authSubmitBtn");

  if (!email || !password) {
    setAuthMessage(
      "Enter your email and password.",
      "error"
    );

    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Signing In…";

  setAuthMessage("Signing in…");

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error(
        "The account could not be verified."
      );
    }

    const { data: roleData, error: roleError } =
      await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (roleError) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "Your account access could not be verified."
      );
    }

    if (!roleData) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "This account has not been approved for this website."
      );
    }

    closeAuth();

    await refreshSessionAndRole();

    showToast("Signed in.");
  } catch (error) {
    console.error("Sign-in failed:", error);

    setAuthMessage(
      error.message ||
        "Unable to sign in. Check your email and password.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign In";
  }
}

export async function signOut() {
  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error("Sign-out failed:", error);
    showToast("Could not sign out.");
    return;
  }

  await refreshSessionAndRole();

  showToast("Signed out.");
}

export function listenForAuthChanges() {
  supabaseClient.auth.onAuthStateChange(() => {
    window.setTimeout(() => {
      refreshSessionAndRole().catch(error => {
        console.error(
          "Could not refresh account state:",
          error
        );
      });
    }, 0);
  });
}
