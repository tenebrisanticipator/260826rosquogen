import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LoginPage from "@/pages/LoginPage";
import { Activity, FilePlus2, FileText, LayoutDashboard, LogOut, Menu, Settings, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const userNavigation = [
  { label: "My home", path: "/home", icon: LayoutDashboard },
  { label: "New quotation", path: "/quotations/new", icon: FilePlus2 },
  { label: "My quotations", path: "/quotations", icon: FileText },
];

const adminNavigation = [
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Activity log", path: "/admin/activity", icon: Activity },
  { label: "Template settings", path: "/admin/settings", icon: Settings },
];

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-3 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
      <img src="/assets/roshni-quotation/roshni-solar-official-logo.png" alt="Roshni Solar Logo" className="h-10 w-auto object-contain" />
      <span className="min-w-0 leading-none"><span className="block font-display text-lg font-extrabold tracking-tight text-slate-900">Roshni Solar</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.18em] text-sky-700">Quotation studio</span></span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const primaryNavigation = user?.role === "admin" ? [{ label: "Admin dashboard", path: "/admin/dashboard", icon: LayoutDashboard }, { label: "New quotation", path: "/quotations/new", icon: FilePlus2 }, { label: "All quotations", path: "/quotations", icon: FileText }] : userNavigation;
  const renderItem = (item: (typeof primaryNavigation)[number]) => {
    const active = location === item.path || (item.path === "/quotations" && location.startsWith("/quotations/"));
    const Icon = item.icon;
    return <Link key={item.path} href={item.path} onClick={onNavigate} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${active ? "bg-sky-50 text-sky-800 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><Icon className={`h-4 w-4 ${active ? "text-sky-700" : "text-slate-400 group-hover:text-sky-600"}`} />{item.label}</Link>;
  };
  return <nav className="space-y-1">{primaryNavigation.map(renderItem)}{user?.role === "admin" && <><div className="px-3 pt-6 pb-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">Administration</div>{adminNavigation.map(renderItem)}</>}</nav>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-4 border-sky-200 border-t-sky-700" /></div>;
  if (!user) return <LoginPage />;
  const side = <div className="flex h-full flex-col"><Brand /><div className="mt-9 flex-1"><NavLinks onNavigate={() => setMobileOpen(false)} /></div><div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5"><Avatar className="h-9 w-9"><AvatarFallback className="bg-sky-100 text-xs font-extrabold text-sky-700">{user.name?.slice(0, 2).toUpperCase() || "RS"}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{user.name || "Roshni user"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{user.role === "admin" ? "Administrator" : "Sales user"}</p></div><button onClick={logout} title="Log out" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" /><span className="hidden xl:inline">Log out</span></button></div></div>;
  return <div className="min-h-screen overflow-x-hidden bg-[#f7fafb]"><aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-slate-200/80 bg-white px-5 py-5 lg:block">{side}</aside><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:hidden"><Brand /><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700"><Menu className="h-5 w-5" /></button></SheetTrigger><SheetContent side="left" className="w-[290px] p-5">{side}</SheetContent></Sheet></header><main className="min-h-screen min-w-0 lg:pl-[260px]"><div className="mx-auto w-full max-w-[1400px] p-4 pb-20 sm:p-6 sm:pb-20 lg:p-8 lg:pb-20">{children}</div></main><footer className="midh-watermark fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white/90 py-2 text-center text-[11px] font-semibold tracking-wide text-slate-400 backdrop-blur no-print">Made by <span className="font-extrabold text-sky-600">MIDH Infotech</span></footer></div>;
}
