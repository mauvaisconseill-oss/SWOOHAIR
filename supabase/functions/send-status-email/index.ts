// ============================================================
// SWOO HAIR — envoi d'e-mail à la cliente (accepté / refusé)
// Déployée avec : supabase functions deploy send-status-email
// Secrets nécessaires (jamais dans le code front) :
//   supabase secrets set RESEND_API_KEY=xxxx
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxxx
//   supabase secrets set SUPABASE_URL=https://ton-projet.supabase.co
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "SWOO HAIR <reservations@ton-domaine-verifie.com>";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { id, status } = await req.json();
  if (!id || !["confirmed", "declined"].includes(status)) {
    return new Response(JSON.stringify({ error: "Paramètres invalides" }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !reservation) {
    return new Response(JSON.stringify({ error: "Réservation introuvable" }), { status: 404 });
  }

  const isConfirmed = status === "confirmed";
  const subject = isConfirmed
    ? "Ta réservation SWOO HAIR est confirmée"
    : "À propos de ta demande SWOO HAIR";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="font-family:Georgia,serif">SWOO HAIR</h2>
      <p>Bonjour ${reservation.nom},</p>
      ${isConfirmed ? `
        <p>Ta réservation est <b>confirmée</b> :</p>
        <ul>
          <li>Prestation : ${reservation.service_name} (${reservation.service_price})</li>
          <li>Date : ${reservation.date} à ${reservation.heure}</li>
        </ul>
        <p>L'adresse exacte te sera transmise en message privé Instagram.</p>
      ` : `
        <p>Je ne peux malheureusement pas honorer ta demande pour le <b>${reservation.date} à ${reservation.heure}</b>.</p>
        <p>N'hésite pas à choisir un autre créneau directement sur le site, ou à m'écrire sur Instagram pour trouver une alternative.</p>
      `}
      <p>À bientôt,<br>SWOO HAIR</p>
    </div>
  `;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: reservation.email,
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    return new Response(JSON.stringify({ error: "Échec envoi e-mail", detail: errText }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
