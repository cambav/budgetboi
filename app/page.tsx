import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parchment gap-6">
      <h1 className="text-5xl font-bold text-forest">budgetboi</h1>
      <Link
        href="/signup"
        className="bg-forest text-white rounded-full px-8 py-4 text-base font-medium hover:opacity-90 transition-opacity"
      >
        Connect your bank
      </Link>
    </main>
  );
}
