   const state = {
      recipes: [],
      currentUser: null,
      currentRole: "guest",
      currentViewId: null,
      editingRecipeId: null,
      authMode: "signin"
    };

    const recipeGrid = document.getElementById("recipeGrid");
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const searchInput = document.getElementById("searchInput");
    const toast = document.getElementById("toast");

    const roleBadge = document.getElementById("roleBadge");
    const accountEmail = document.getElementById("accountEmail");
    const accountSubtext = document.getElementById("accountSubtext");
    const authBtn = document.getElementById("authBtn");
    const signOutBtn = document.getElementById("signOutBtn");
    const manageUsersBtn = document.getElementById("manageUsersBtn");
    const addBtn = document.getElementById("addBtn");
    const emptyAddBtn = document.getElementById("emptyAddBtn");

    const viewModal = document.getElementById("viewModal");
    const formModal = document.getElementById("formModal");
    const authModal = document.getElementById("authModal");
    const adminModal = document.getElementById("adminModal");

    const recipeForm = document.getElementById("recipeForm");
    const authForm = document.getElementById("authForm");

    function isConfigured() {
      return (
        SUPABASE_PUBLISHABLE_KEY &&
        SUPABASE_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY_HERE"
      );
    }

    function canManageRecipes() {
      return state.currentRole === "family" || state.currentRole === "admin";
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 2800);
    }

    function setModalOpen(modal, isOpen) {
      modal.classList.toggle("open", isOpen);
      modal.setAttribute("aria-hidden", String(!isOpen));
    }

    function formatRole(role) {
      if (role === "admin") return "Admin";
      if (role === "family") return "Family";
      if (role === "signed_in") return "Signed In";
      return "Guest";
    }

    function formatDate(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    }

    function updateAccountUI() {
      roleBadge.textContent = formatRole(state.currentRole);
      roleBadge.className = `role-badge ${state.currentRole}`;

      if (!state.currentUser) {
        accountEmail.textContent = "Not signed in";
        accountSubtext.textContent = "Guests can browse family recipes.";
        authBtn.hidden = false;
        signOutBtn.hidden = true;
        manageUsersBtn.hidden = true;
      } else {
        accountEmail.textContent = state.currentUser.email || "Signed-in user";

        if (state.currentRole === "admin") {
          accountSubtext.textContent = "You can manage recipes and user roles.";
        } else if (state.currentRole === "family") {
          accountSubtext.textContent = "You can add, edit, and delete recipes.";
        } else {
          accountSubtext.textContent = "Your account can browse recipes.";
        }

        authBtn.hidden = true;
        signOutBtn.hidden = false;
        manageUsersBtn.hidden = state.currentRole !== "admin";
      }

      const manageRecipes = canManageRecipes();
      addBtn.hidden = !manageRecipes;
      emptyAddBtn.hidden = !manageRecipes;
      document.getElementById("editBtn").hidden = !manageRecipes;
      document.getElementById("deleteBtn").hidden = !manageRecipes;
    }

    async function refreshSessionAndRole() {
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
          showToast("Signed in, but the account role could not be loaded.");
          state.currentRole = "signed_in";
        } else {
          state.currentRole = data?.role || "signed_in";
        }
      }

      updateAccountUI();
    }

    async function loadRecipes() {
      loadingState.hidden = false;
      recipeGrid.hidden = true;
      emptyState.hidden = true;

      const { data, error } = await supabaseClient
        .from("recipes")
        .select("id, title, author, ingredients, instructions, notes, created_at")
        .order("created_at", { ascending: false });

      loadingState.hidden = true;

      if (error) {
        console.error("Could not load recipes:", error);
        loadingState.textContent = "Recipes could not be loaded.";
        loadingState.hidden = false;
        showToast("Could not load recipes.");
        return;
      }

      state.recipes = data || [];
      renderRecipes(searchInput.value);
    }

    function renderRecipes(filter = "") {
      const query = filter.trim().toLowerCase();

      const filtered = state.recipes.filter(recipe => {
        if (!query) return true;

        return [recipe.title, recipe.author, recipe.ingredients]
          .filter(Boolean)
          .some(value => value.toLowerCase().includes(query));
      });

      recipeGrid.innerHTML = "";

      if (filtered.length === 0) {
        recipeGrid.hidden = true;
        emptyState.hidden = false;

        const emptyText = emptyState.querySelector("p");
        emptyText.textContent = query
          ? "No recipes match your search."
          : "No recipes have been added yet.";
        return;
      }

      emptyState.hidden = true;
      recipeGrid.hidden = false;

      filtered.forEach(recipe => {
        const card = document.createElement("article");
        card.className = "recipe-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Open ${recipe.title}`);

        const title = document.createElement("h3");
        title.textContent = recipe.title;

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `by ${recipe.author}`;

        const preview = document.createElement("div");
        preview.className = "preview";
        const firstIngredient =
          String(recipe.ingredients || "")
            .split("\n")
            .find(line => line.trim()) || "";
        preview.textContent = firstIngredient
          ? `${firstIngredient.trim()}…`
          : "Open recipe for details";

        card.append(title, meta, preview);
        card.addEventListener("click", () => openView(recipe.id));
        card.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openView(recipe.id);
          }
        });

        recipeGrid.appendChild(card);
      });
    }

    function openView(id) {
      const recipe = state.recipes.find(item => item.id === id);
      if (!recipe) return;

      state.currentViewId = id;

      document.getElementById("viewTitle").textContent = recipe.title;

      const dateText = formatDate(recipe.created_at);
      document.getElementById("viewMeta").textContent = dateText
        ? `Shared by ${recipe.author} · ${dateText}`
        : `Shared by ${recipe.author}`;

      const ingredientsList = document.getElementById("viewIngredients");
      ingredientsList.innerHTML = "";

      String(recipe.ingredients || "")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .forEach(line => {
          const item = document.createElement("li");
          item.textContent = line;
          ingredientsList.appendChild(item);
        });

      document.getElementById("viewInstructions").textContent =
        recipe.instructions || "";

      const notesWrap = document.getElementById("viewNotesWrap");
      if (recipe.notes && recipe.notes.trim()) {
        notesWrap.hidden = false;
        document.getElementById("viewNotes").textContent = recipe.notes;
      } else {
        notesWrap.hidden = true;
      }

      document.getElementById("editBtn").hidden = !canManageRecipes();
      document.getElementById("deleteBtn").hidden = !canManageRecipes();

      setModalOpen(viewModal, true);
    }

    function closeView() {
      setModalOpen(viewModal, false);
      state.currentViewId = null;
    }

    function openAddForm() {
      if (!canManageRecipes()) {
        showToast("Family or admin access is required.");
        return;
      }

      state.editingRecipeId = null;
      recipeForm.reset();
      document.getElementById("formTitle").textContent = "Add a Recipe";
      document.getElementById("saveRecipeBtn").textContent = "Save Recipe";
      setFormMessage("");
      setModalOpen(formModal, true);
      document.getElementById("titleInput").focus();
    }

    function openEditForm() {
      if (!canManageRecipes() || !state.currentViewId) return;

      const recipe = state.recipes.find(item => item.id === state.currentViewId);
      if (!recipe) return;

      state.editingRecipeId = recipe.id;
      document.getElementById("titleInput").value = recipe.title || "";
      document.getElementById("authorInput").value = recipe.author || "";
      document.getElementById("ingredientsInput").value = recipe.ingredients || "";
      document.getElementById("instructionsInput").value = recipe.instructions || "";
      document.getElementById("notesInput").value = recipe.notes || "";
      document.getElementById("formTitle").textContent = "Edit Recipe";
      document.getElementById("saveRecipeBtn").textContent = "Save Changes";
      setFormMessage("");

      closeView();
      setModalOpen(formModal, true);
      document.getElementById("titleInput").focus();
    }

    function closeForm() {
      setModalOpen(formModal, false);
      state.editingRecipeId = null;
      setFormMessage("");
    }

    function setFormMessage(message, type = "") {
      const element = document.getElementById("recipeFormMessage");
      element.textContent = message;
      element.className = `auth-message ${type}`.trim();
    }

    async function saveRecipe(event) {
      event.preventDefault();

      if (!canManageRecipes()) {
        setFormMessage("Family or admin access is required.", "error");
        return;
      }

      const title = document.getElementById("titleInput").value.trim();
      const author = document.getElementById("authorInput").value.trim();
      const ingredients = document.getElementById("ingredientsInput").value.trim();
      const instructions = document.getElementById("instructionsInput").value.trim();
      const notes = document.getElementById("notesInput").value.trim();

      if (!title || !author || !ingredients || !instructions) {
        setFormMessage("Complete all required fields.", "error");
        return;
      }

      const saveButton = document.getElementById("saveRecipeBtn");
      saveButton.disabled = true;
      setFormMessage("Saving…");

      const payload = {
        title,
        author,
        ingredients,
        instructions,
        notes
      };

      let result;

      if (state.editingRecipeId) {
        result = await supabaseClient
          .from("recipes")
          .update(payload)
          .eq("id", state.editingRecipeId);
      } else {
        result = await supabaseClient
          .from("recipes")
          .insert(payload);
      }

      saveButton.disabled = false;

      if (result.error) {
        console.error("Could not save recipe:", result.error);
        setFormMessage(
          result.error.message || "The recipe could not be saved.",
          "error"
        );
        return;
      }

      const wasEditing = Boolean(state.editingRecipeId);
      closeForm();
      searchInput.value = "";
      await loadRecipes();
      showToast(wasEditing ? "Recipe updated." : "Recipe added — thank you!");
    }

    async function deleteCurrent() {
      if (!canManageRecipes() || !state.currentViewId) return;

      const recipe = state.recipes.find(item => item.id === state.currentViewId);
      if (!recipe) return;

      const confirmed = window.confirm(
        `Delete "${recipe.title}"? This cannot be undone.`
      );

      if (!confirmed) return;

      const recipeId = state.currentViewId;
      const deleteButton = document.getElementById("deleteBtn");
      deleteButton.disabled = true;

      const { error } = await supabaseClient
        .from("recipes")
        .delete()
        .eq("id", recipeId);

      deleteButton.disabled = false;

      if (error) {
        console.error("Could not delete recipe:", error);
        showToast(error.message || "The recipe could not be deleted.");
        return;
      }

      closeView();
      await loadRecipes();
      showToast("Recipe deleted.");
    }

    function setAuthMode(mode) {
      state.authMode = mode;
      const signingUp = mode === "signup";

      document.getElementById("authTitle").textContent =
        signingUp ? "Create Account" : "Sign In";
      document.getElementById("authSubmitBtn").textContent =
        signingUp ? "Create Account" : "Sign In";
      document.getElementById("passwordHint").textContent =
        signingUp
          ? "Use at least 8 characters."
          : "Enter your account password.";
      document.getElementById("passwordInput").autocomplete =
        signingUp ? "new-password" : "current-password";

      document.getElementById("signInTab").classList.toggle("active", !signingUp);
      document.getElementById("signUpTab").classList.toggle("active", signingUp);
      setAuthMessage("");
    }

    function setAuthMessage(message, type = "") {
      const element = document.getElementById("authMessage");
      element.textContent = message;
      element.className = `auth-message ${type}`.trim();
    }

    function openAuth() {
      authForm.reset();
      setAuthMode("signin");
      setModalOpen(authModal, true);
      document.getElementById("emailInput").focus();
    }

    function closeAuth() {
      setModalOpen(authModal, false);
      setAuthMessage("");
    }

    async function submitAuth(event) {
      event.preventDefault();

      const email = document.getElementById("emailInput").value.trim();
      const password = document.getElementById("passwordInput").value;
      const submitButton = document.getElementById("authSubmitBtn");

      submitButton.disabled = true;
      setAuthMessage(
        state.authMode === "signup" ? "Creating account…" : "Signing in…"
      );

      if (state.authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href
          }
        });

        submitButton.disabled = false;

        if (error) {
          console.error("Sign-up failed:", error);
          setAuthMessage(error.message, "error");
          return;
        }

        if (data.session) {
          closeAuth();
          await refreshSessionAndRole();
          showToast("Account created and signed in.");
        } else {
          setAuthMessage(
            "Account created. Check your email to confirm it, then sign in.",
            "success"
          );
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        submitButton.disabled = false;

        if (error) {
          console.error("Sign-in failed:", error);
          setAuthMessage(error.message, "error");
          return;
        }

        closeAuth();
        await refreshSessionAndRole();
        showToast("Signed in.");
      }
    }

    async function signOut() {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error("Sign-out failed:", error);
        showToast("Could not sign out.");
        return;
      }

      closeView();
      closeForm();
      setModalOpen(adminModal, false);
      await refreshSessionAndRole();
      showToast("Signed out.");
    }

    async function openAdminPanel() {
      if (state.currentRole !== "admin") {
        showToast("Admin access is required.");
        return;
      }

      setModalOpen(adminModal, true);
      await loadAdminUsers();
    }

    function closeAdminPanel() {
      setModalOpen(adminModal, false);
    }

    async function loadAdminUsers() {
      const loading = document.getElementById("adminLoading");
      const list = document.getElementById("userList");
      const message = document.getElementById("adminMessage");

      loading.hidden = false;
      list.hidden = true;
      list.innerHTML = "";
      message.textContent = "";
      message.className = "auth-message";

      const { data, error } = await supabaseClient.rpc("admin_list_users");

      loading.hidden = true;

      if (error) {
        console.error("Could not list users:", error);
        message.textContent = error.message || "Users could not be loaded.";
        message.className = "auth-message error";
        return;
      }

      (data || []).forEach(user => {
        const row = document.createElement("div");
        row.className = "user-row";

        const details = document.createElement("div");

        const email = document.createElement("div");
        email.className = "user-email";
        email.textContent = user.email || "(No email)";

        const created = document.createElement("div");
        created.className = "user-created";
        created.textContent = `Joined ${formatDate(user.created_at) || "unknown date"}`;

        details.append(email, created);

        const select = document.createElement("select");
        select.setAttribute("aria-label", `Role for ${user.email || "user"}`);

        [
          ["signed_in", "Signed In"],
          ["family", "Family"],
          ["admin", "Admin"]
        ].forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          option.selected = user.role === value;
          select.appendChild(option);
        });

        select.addEventListener("change", async () => {
          const previousRole = user.role;
          const newRole = select.value;
          select.disabled = true;

          const { error: updateError } = await supabaseClient.rpc(
            "admin_set_user_role",
            {
              target_user_id: user.user_id,
              new_role: newRole
            }
          );

          select.disabled = false;

          if (updateError) {
            console.error("Could not change role:", updateError);
            select.value = previousRole;
            message.textContent =
              updateError.message || "The user's role could not be changed.";
            message.className = "auth-message error";
            return;
          }

          user.role = newRole;
          message.textContent = `${user.email || "User"} is now ${formatRole(newRole)}.`;
          message.className = "auth-message success";

          if (user.user_id === state.currentUser?.id) {
            await refreshSessionAndRole();

            if (state.currentRole !== "admin") {
              closeAdminPanel();
              showToast("Your role was changed.");
            }
          }
        });

        row.append(details, select);
        list.appendChild(row);
      });

      list.hidden = false;
    }

    function closeOnBackdrop(event, modal, closeFunction) {
      if (event.target === modal) closeFunction();
    }

    document.getElementById("addBtn").addEventListener("click", openAddForm);
    document.getElementById("emptyAddBtn").addEventListener("click", openAddForm);

    document.getElementById("viewClose").addEventListener("click", closeView);
    document.getElementById("viewCloseBtn").addEventListener("click", closeView);
    document.getElementById("editBtn").addEventListener("click", openEditForm);
    document.getElementById("deleteBtn").addEventListener("click", deleteCurrent);

    document.getElementById("formClose").addEventListener("click", closeForm);
    document.getElementById("formCancel").addEventListener("click", closeForm);
    recipeForm.addEventListener("submit", saveRecipe);

    authBtn.addEventListener("click", openAuth);
    signOutBtn.addEventListener("click", signOut);
    document.getElementById("authClose").addEventListener("click", closeAuth);
    document.getElementById("authCancel").addEventListener("click", closeAuth);
    document.getElementById("signInTab").addEventListener("click", () => setAuthMode("signin"));
    document.getElementById("signUpTab").addEventListener("click", () => setAuthMode("signup"));
    authForm.addEventListener("submit", submitAuth);

    manageUsersBtn.addEventListener("click", openAdminPanel);
    document.getElementById("adminClose").addEventListener("click", closeAdminPanel);
    document.getElementById("adminCloseBtn").addEventListener("click", closeAdminPanel);
    document.getElementById("refreshUsersBtn").addEventListener("click", loadAdminUsers);

    searchInput.addEventListener("input", () => renderRecipes(searchInput.value));

    viewModal.addEventListener("click", event =>
      closeOnBackdrop(event, viewModal, closeView)
    );
    formModal.addEventListener("click", event =>
      closeOnBackdrop(event, formModal, closeForm)
    );
    authModal.addEventListener("click", event =>
      closeOnBackdrop(event, authModal, closeAuth)
    );
    adminModal.addEventListener("click", event =>
      closeOnBackdrop(event, adminModal, closeAdminPanel)
    );

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      if (adminModal.classList.contains("open")) closeAdminPanel();
      else if (authModal.classList.contains("open")) closeAuth();
      else if (formModal.classList.contains("open")) closeForm();
      else if (viewModal.classList.contains("open")) closeView();
    });

    supabaseClient.auth.onAuthStateChange(async () => {
      await refreshSessionAndRole();
    });

    async function init() {
      if (!isConfigured()) {
        loadingState.textContent =
          "Setup required: paste your Supabase publishable key into js/config.js.";
        authBtn.disabled = true;
        return;
      }

      await refreshSessionAndRole();
      await loadRecipes();
    }

    init();
