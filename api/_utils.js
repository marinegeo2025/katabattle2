// api/_utils.js
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// --- Supabase client (server-side only) ---
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
);

export const sha256 = (s) =>
  crypto.createHash("sha256").update(String(s)).digest("hex");

export const randToken = (n = 16) =>
  crypto.randomBytes(n).toString("base64url");

export const slugify = (s) =>
  (s || "kata-battle")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

// --- Battle load/save ---
export async function loadBattle(slug) {
  const { data, error } = await supabase
    .from("battles").select("data").eq("slug", slug).single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.data || null;
}

export async function saveBattle(slug, doc) {
  const { error } = await supabase
    .from("battles")
    .upsert({ slug, data: doc }, { onConflict: "slug" });
  if (error) throw error;
}

// Strip secrets from public snapshot
export function mask(doc) {
  const judges = (doc.judges || []).map(j => ({
    name: j.name || "Judge",
    submitted: !!j.submitted
  }));
  return { ...doc, judges };
}

// -------------------------
// MUX HELPERS
// -------------------------
function muxHeaders() {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) throw new Error("MUX credentials missing");
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  return { "Authorization": `Basic ${basic}`, "Content-Type": "application/json" };
}

export async function muxCreateDirectUpload({ origin }) {
  const body = {
    cors_origin: origin || process.env.APP_BASE_URL || "*",
    new_asset_settings: { playback_policy: ["public"] }
  };
  const r = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: muxHeaders(),
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Mux create upload failed:", r.status, j);
    throw new Error(j?.error?.message || "Mux: failed to create upload");
  }
  return { uploadId: j.data.id, uploadURL: j.data.url };
}

export async function muxGetUpload(uploadId) {
  const r = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, { headers: muxHeaders() });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Mux: failed to get upload");
  return j.data; // { id, status, asset_id, error }
}

export async function muxGetAsset(assetId) {
  const r = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, { headers: muxHeaders() });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Mux: failed to get asset");
  return j.data; // { status, playback_ids: [{id, policy}], ... }
}

// ✅ this must be present and exported
export async function muxCreatePlaybackId(assetId, policy = "public") {
  const r = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/playback-ids`, {
    method: "POST",
    headers: muxHeaders(),
    body: JSON.stringify({ policy })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Mux create playback-id failed:", r.status, j);
    throw new Error(j?.error?.message || "Mux: failed to create playback-id");
  }
  return j.data; // { id, policy }
}
