/** Next.js startup hook: migrate → wipe → seed → issue the M2 sandbox invoice. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureBooted } = await import("@/lib/app/boot");
  await ensureBooted().catch((e) => console.error("[scopelock] boot failed", e));
}
