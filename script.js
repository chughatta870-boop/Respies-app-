/* ===========================================================
   ریسپیز — M Ijaz · GHS 124/NB
   Vanilla JS app logic (no build step, no frameworks)
   =========================================================== */

(function () {
  "use strict";

  var FAV_KEY = "ijaz_recipes_favs_v1";

  var state = {
    query: "",
    cat: "سب",
    showFavOnly: false,
    favs: loadFavs()
  };

  var els = {
    grid: document.getElementById("listView"),
    empty: document.getElementById("emptyState"),
    search: document.getElementById("searchInput"),
    tabs: document.getElementById("catTabs"),
    favBtn: document.getElementById("favToggleBtn"),
    favCount: document.getElementById("favCount"),
    overlay: document.getElementById("detailOverlay"),
    back: document.getElementById("detailBack"),
    detailFav: document.getElementById("detailFav"),
    catBadge: document.getElementById("detailCatBadge"),
    title: document.getElementById("detailTitle"),
    servings: document.getElementById("detailServings"),
    prep: document.getElementById("detailPrep"),
    cook: document.getElementById("detailCook"),
    ingList: document.getElementById("detailIngredients"),
    stepsList: document.getElementById("detailSteps"),
    toast: document.getElementById("toast")
  };

  var activeRecipeId = null;
  var toastTimer = null;

  function loadFavs() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(state.favs));
    } catch (e) { /* storage unavailable — ignore silently */ }
  }

  function isFav(id) {
    return state.favs.indexOf(id) !== -1;
  }

  function toggleFav(id) {
    var idx = state.favs.indexOf(id);
    if (idx === -1) {
      state.favs.push(id);
      showToast("پسندیدہ میں شامل کر دیا گیا");
    } else {
      state.favs.splice(idx, 1);
      showToast("پسندیدہ سے ہٹا دیا گیا");
    }
    saveFavs();
    updateFavCount();
  }

  function updateFavCount() {
    var n = state.favs.length;
    els.favCount.textContent = n;
    els.favCount.classList.toggle("zero", n === 0);
    els.favBtn.classList.toggle("active", state.showFavOnly);
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.add("hidden");
    }, 1600);
  }

  function buildTabs() {
    els.tabs.innerHTML = "";
    CATEGORIES.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className = "cat-tab" + (cat === state.cat ? " active" : "");
      btn.textContent = cat;
      btn.setAttribute("data-cat", cat);
      btn.addEventListener("click", function () {
        state.cat = cat;
        state.showFavOnly = false;
        updateFavCount();
        highlightTabs();
        render();
      });
      els.tabs.appendChild(btn);
    });
  }

  function highlightTabs() {
    var kids = els.tabs.querySelectorAll(".cat-tab");
    kids.forEach(function (k) {
      k.classList.toggle("active", k.getAttribute("data-cat") === state.cat);
    });
  }

  function normalize(s) {
    return (s || "").toString().trim();
  }

  function matchesQuery(recipe, q) {
    if (!q) return true;
    var hay = recipe.name + " " + recipe.cat + " " + recipe.ing.join(" ");
    return hay.indexOf(q) !== -1;
  }

  function getFiltered() {
    var q = normalize(state.query);
    return RECIPES.filter(function (r) {
      if (state.showFavOnly && !isFav(r.id)) return false;
      if (!state.showFavOnly && state.cat !== "سب" && r.cat !== state.cat) return false;
      if (q && !matchesQuery(r, q)) return false;
      return true;
    });
  }

  function cardHTML(r) {
    var favDotClass = isFav(r.id) ? "card-fav-dot" : "card-fav-dot hidden";
    return (
      '<div class="recipe-card" data-id="' + r.id + '">' +
        '<span class="' + favDotClass + '" data-favdot="' + r.id + '"></span>' +
        '<span class="card-cat">' + escapeHTML(r.cat) + '</span>' +
        '<h3 class="card-title">' + escapeHTML(r.name) + '</h3>' +
        '<div class="card-meta"><span>👥 ' + escapeHTML(r.servings) + '</span><span>⏱ ' + escapeHTML(r.cook) + '</span></div>' +
      '</div>'
    );
  }

  function escapeHTML(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function render() {
    var list = getFiltered();
    els.empty.classList.toggle("hidden", list.length > 0);
    els.grid.innerHTML = list.map(cardHTML).join("");
  }

  function findRecipe(id) {
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].id === id) return RECIPES[i];
    }
    return null;
  }

  function openDetail(id) {
    var r = findRecipe(id);
    if (!r) return;
    activeRecipeId = id;

    els.catBadge.textContent = r.cat;
    els.title.textContent = r.name;
    els.servings.textContent = r.servings;
    els.prep.textContent = r.prep;
    els.cook.textContent = r.cook;

    els.ingList.innerHTML = r.ing.map(function (i) {
      return "<li>" + escapeHTML(i) + "</li>";
    }).join("");

    els.stepsList.innerHTML = r.steps.map(function (s) {
      return "<li>" + escapeHTML(s) + "</li>";
    }).join("");

    updateDetailFavButton();

    els.overlay.classList.remove("hidden");
    els.overlay.querySelector(".detail-sheet").scrollTop = 0;
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    els.overlay.classList.add("hidden");
    document.body.style.overflow = "";
    activeRecipeId = null;
  }

  function updateDetailFavButton() {
    var fav = activeRecipeId !== null && isFav(activeRecipeId);
    els.detailFav.classList.toggle("active", fav);
  }

  // ---------------- Events ----------------

  els.grid.addEventListener("click", function (e) {
    var card = e.target.closest(".recipe-card");
    if (card) {
      var id = parseInt(card.getAttribute("data-id"), 10);
      openDetail(id);
    }
  });

  els.search.addEventListener("input", function () {
    state.query = els.search.value;
    render();
  });

  els.favBtn.addEventListener("click", function () {
    state.showFavOnly = !state.showFavOnly;
    updateFavCount();
    render();
  });

  els.back.addEventListener("click", closeDetail);

  els.overlay.addEventListener("click", function (e) {
    if (e.target === els.overlay) closeDetail();
  });

  els.detailFav.addEventListener("click", function () {
    if (activeRecipeId === null) return;
    toggleFav(activeRecipeId);
    updateDetailFavButton();
    render(); // refresh fav dot on grid behind
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDetail();
  });

  // ---------------- Init ----------------

  function applyLaunchParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var view = params.get("view");
      var cat = params.get("cat");
      if (view === "favorites") {
        state.showFavOnly = true;
      } else if (cat && CATEGORIES.indexOf(cat) !== -1) {
        state.cat = cat;
      }
    } catch (e) { /* URLSearchParams unsupported — ignore, default view applies */ }
  }

  function init() {
    applyLaunchParams();
    buildTabs();
    updateFavCount();
    highlightTabs();
    render();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {
          /* offline registration failure is non-fatal */
        });
      });
    }
  }

  init();
})();
 
