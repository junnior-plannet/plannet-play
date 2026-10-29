export const REMEMBERED_EMAIL_KEY = "plannet.remembered-email";

export function readRememberedEmail(storage: Pick<Storage, "getItem">): string {
  try { return storage.getItem(REMEMBERED_EMAIL_KEY) ?? ""; } catch { return ""; }
}

/** Persist only an opted-in email, never credentials or session data. */
export function rememberEmail(storage: Pick<Storage, "setItem" | "removeItem">, email: string, remember: boolean) {
  try {
    if (remember) storage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
    else storage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch { /* Private browsing may deny storage; sign-in must still work. */ }
}