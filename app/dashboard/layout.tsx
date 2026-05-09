import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatDrawer from "@/components/ChatDrawer";
import { BottomNav, SidebarNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-parchment">
      <div className="lg:flex lg:max-w-5xl lg:mx-auto lg:min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:pt-8 lg:pb-6 lg:border-r lg:border-gray-100 lg:bg-white">
          <div className="px-5 mb-8">
            <span className="text-xl font-bold text-forest">budgetboi</span>
          </div>
          <SidebarNav />
        </aside>

        {/* Content */}
        <div className="lg:flex-1 lg:min-w-0">
          <div className="flex flex-col min-h-screen max-w-md mx-auto lg:max-w-none relative">
            <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">{children}</main>
            <ChatDrawer />
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}
