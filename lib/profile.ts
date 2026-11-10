export type AuthMethod = "wallet" | "google";

export type Profile = {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  address: string;
  authMethod: AuthMethod;
  createdAt: string;
};

export type PublicProfile = {
  displayName: string;
  username: string;
  address: string;
  authMethod: AuthMethod;
};

const NAME_CHARS = /^[A-Za-z][A-Za-z '\-]*$/;
const DISPLAY_CHARS = /^[A-Za-z0-9][A-Za-z0-9 .'\-]*$/;
export const USERNAME_CHARS = /^[a-z0-9_]{3,20}$/;

export type FieldError = { field: string; message: string };

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateName(value: string, kind: "first" | "last"): string | null {
  const v = value.trim();
  if (!v) {
    return kind === "first" ? "Add your first name." : "Add your last name. Only you and Kolo see it.";
  }
  if (v.length > 40 || !NAME_CHARS.test(v)) {
    return "Use letters, spaces, ' or - only.";
  }
  return null;
}

export function validateDisplayName(value: string): string | null {
  const v = value.trim();
  if (v.length < 2 || v.length > 24) return "Use 2 to 24 characters.";
  if (!DISPLAY_CHARS.test(v)) return "Use letters, numbers, spaces, '.', ' or - only.";
  return null;
}

export function validateUsername(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!USERNAME_CHARS.test(v)) {
    return "Use 3 to 20 lowercase letters, numbers or underscore.";
  }
  return null;
}

export function validateProfileInput(input: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
}): { ok: true; value: Pick<Profile, "firstName" | "lastName" | "displayName" | "username"> } | { ok: false; errors: FieldError[] } {
  const firstName = trim(input.firstName);
  const lastName = trim(input.lastName);
  const displayName = trim(input.displayName);
  const username = trim(input.username).toLowerCase();
  const errors: FieldError[] = [];
  const firstErr = validateName(firstName, "first");
  if (firstErr) errors.push({ field: "firstName", message: firstErr });
  const lastErr = validateName(lastName, "last");
  if (lastErr) errors.push({ field: "lastName", message: lastErr });
  const displayErr = validateDisplayName(displayName);
  if (displayErr) errors.push({ field: "displayName", message: displayErr });
  const userErr = validateUsername(username);
  if (userErr) errors.push({ field: "username", message: userErr });
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { firstName, lastName, displayName, username } };
}

export function publicProfile(profile: Profile): PublicProfile {
  return {
    displayName: profile.displayName,
    username: profile.username,
    address: profile.address,
    authMethod: profile.authMethod,
  };
}

export function ownProfile(profile: Profile): Profile {
  return { ...profile };
}

export function isProfileComplete(profile: unknown): profile is Profile {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Partial<Profile>;
  const firstName = typeof p.firstName === "string" ? p.firstName.trim() : "";
  const lastName = typeof p.lastName === "string" ? p.lastName.trim() : "";
  const displayName = typeof p.displayName === "string" ? p.displayName.trim() : "";
  const username = typeof p.username === "string" ? p.username.trim().toLowerCase() : "";
  return Boolean(firstName && lastName && displayName && USERNAME_CHARS.test(username));
}

export function formValuesFromProfile(profile: Partial<Profile> | null | undefined): {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
} {
  return {
    firstName: typeof profile?.firstName === "string" ? profile.firstName : "",
    lastName: typeof profile?.lastName === "string" ? profile.lastName : "",
    displayName: typeof profile?.displayName === "string" ? profile.displayName : "",
    username: typeof profile?.username === "string" ? profile.username : "",
  };
}

/** Used by `/circles/new` via requireUser: complete profiles stay; others go to 01p. */
export function incompleteProfileRedirect(profile: unknown): "/profile" | null {
  return isProfileComplete(profile) ? null : "/profile";
}

export function displayPreview(displayName: string): string {
  return displayName.trim() || "your display name";
}

export function avatarInitial(displayName: string): string {
  const t = displayName.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

export function shortAddress(address: string): string {
  if (!address) return "";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function signInMessage(args: { address: string; date: string; code: string }): string {
  return `Sign in to Kolo\nAddress: ${args.address}\nDate: ${args.date}\nCode: ${args.code}`;
}
