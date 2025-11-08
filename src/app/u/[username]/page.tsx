import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

export default async function UserPage({ params }: { params: { username?: string } }) {
  const username = params?.username;
  console.log(">>> DEBUG username param:", username);

  if (!username) {
    console.error(">>> No username param found!");
    return <div className="p-8 text-center text-red-500">Error: no username in params.</div>;
  }

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, name: true, username: true, bio: true, image: true },
  });

  console.log(">>> DEBUG prisma result:", user);

  if (!user) {
    return <div className="p-8 text-center text-red-500">No user found for "{username}"</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex flex-col items-center text-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.image ?? "/default-avatar.png"}
          alt={user.username ?? "User"}
          className="w-24 h-24 rounded-full object-cover"
        />
        <h1 className="text-2xl font-semibold">@{user.username}</h1>
        {user.name && <p className="text-gray-500">{user.name}</p>}
        {user.bio && <p className="mt-1 text-gray-600">{user.bio}</p>}
      </div>
    </div>
  );
}
