import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = "default";

export async function getOrCreateDefaultUser() {
  return prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      name: "Default User",
    },
  });
}

export async function getDefaultUserId(): Promise<string> {
  const user = await getOrCreateDefaultUser();
  return user.id;
}
