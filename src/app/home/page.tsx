import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";

const DashboardHome = dynamic(() => import("@/components/DashboardHome"), { ssr: false });

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }
  return <DashboardHome />;
}
