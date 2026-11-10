import { redirect } from "next/navigation";
import { getProfile } from "./auth-store";
import { incompleteProfileRedirect, isProfileComplete } from "./profile";
import { getRequestSession } from "./request-session";

export async function requireUser() {
  const session = await getRequestSession();
  if (!session) redirect("/");
  const profile = await getProfile(session.address);
  const toProfile = incompleteProfileRedirect(profile);
  if (toProfile) redirect(toProfile);
  if (!isProfileComplete(profile)) redirect("/profile");
  return { session, profile };
}
