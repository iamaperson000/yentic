import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/home");
  }
  const MarketingHome = (await import("@/app/(marketing)/page")).default;
  return <MarketingHome />;
}
