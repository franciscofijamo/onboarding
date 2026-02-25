import { currentUser } from "@clerk/nextjs/server";

const parseListEnv = (value?: string | null) =>
  value
    ?.split(",")
    .map(entry => entry.trim())
    .filter(Boolean) || [];

const getAdminEmails = () => parseListEnv(process.env.ADMIN_EMAILS);
const getAdminUserIds = () => parseListEnv(process.env.ADMIN_USER_IDS);

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    if (getAdminUserIds().includes(userId)) return true;

    const user = await currentUser();
    if (!user) return false;

    const userEmail = user.emailAddresses[0]?.emailAddress;
    return !!userEmail && getAdminEmails().includes(userEmail);
  } catch (error) {
    console.error("Admin check error:", error);
    return false;
  }
}
