import AdminQuotationManager from "@/components/AdminQuotationManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatIndianCurrency, formatPlantSize } from "@shared/quotation";
import { ArrowUpRight, CalendarDays, FilePlus2, FileText, IndianRupee, UsersRound } from "lucide-react";
import { Link } from "wouter";

const stats = [
  { key: "quotations", label: "Total quotations", icon: FileText, tone: "bg-sky-50 text-sky-700" },
  { key: "thisMonth", label: "This month", icon: CalendarDays, tone: "bg-amber-50 text-amber-700" },
  { key: "customers", label: "Total customers", icon: UsersRound, tone: "bg-emerald-50 text-emerald-700" },
  { key: "quotationValue", label: "Quotation value", icon: IndianRupee, tone: "bg-violet-50 text-violet-700" },
] as const;

export default function Dashboard() {
  const dashboard = trpc.quotations.dashboard.useQuery(undefined, { retry: false });
  const fallback = { quotations: 0, thisMonth: 0, customers: 0, quotationValue: "0" };
  const totals = dashboard.data?.totals ?? fallback;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-sky-700">Administrator overview</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950">Quotation command center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Monitor pipeline value, filter team-generated proposals, and prepare client-ready quotation PDFs from one workspace.</p>
        </div>
        <Link href="/quotations/new"><Button className="h-11 gap-2 bg-sky-700 px-5 text-white hover:bg-sky-800"><FilePlus2 className="h-4 w-4" />New quotation</Button></Link>
      </div>

      {dashboard.isError ? <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800">Dashboard data could not be loaded. Please refresh the page.</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(stat => {
            const Icon = stat.icon;
            const value = stat.key === "quotationValue" ? formatIndianCurrency(totals[stat.key]) : totals[stat.key].toLocaleString("en-IN");
            return <Card key={stat.key} className="border-slate-200/80 shadow-sm"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-semibold text-slate-500">{stat.label}</p><div className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-950">{dashboard.isLoading ? <Skeleton className="h-7 w-24" /> : value}</div></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${stat.tone}`}><Icon className="h-5 w-5" /></span></CardContent></Card>;
          })}
        </section>

        <AdminQuotationManager />

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-display text-lg font-bold text-slate-900">Recent quotations</h2><p className="mt-0.5 text-xs text-slate-500">The latest proposals across the sales team.</p></div>
            <Link href="/quotations" className="inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-900">View all <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          {dashboard.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(item => <Skeleton key={item} className="h-14 w-full" />)}</div> : dashboard.data?.recent.length ? <div className="divide-y divide-slate-100">{dashboard.data.recent.map(({ quotation, creatorName }) => <Link key={quotation.id} href={`/quotations/${quotation.id}`} className="grid gap-2 px-5 py-4 transition hover:bg-sky-50/50 sm:grid-cols-[1.2fr_.8fr_.7fr_.8fr] sm:items-center"><div><p className="font-bold text-slate-800">{quotation.customerName}</p><p className="mt-0.5 text-xs font-medium text-sky-700">{quotation.quotationNumber}</p></div><p className="text-sm text-slate-600">{formatPlantSize(quotation.plantSizeKw)}</p><p className="text-sm font-semibold text-slate-800">{formatIndianCurrency(quotation.plantCost)}</p><p className="text-xs text-slate-500">{creatorName || "Roshni Solar"}</p></Link>)}</div> : <div className="p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700"><FileText className="h-5 w-5" /></div><p className="mt-4 font-bold text-slate-800">No quotations yet</p><p className="mt-1 text-sm text-slate-500">Create the first customer proposal to start tracking business activity.</p><Link href="/quotations/new"><Button variant="outline" className="mt-5 border-sky-200 text-sky-800">Create quotation</Button></Link></div>}
        </section>
      </>}
    </div>
  );
}
