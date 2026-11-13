import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminDateRanges, buildAdminQuotationListInput, type AdminDateRange, type AdminQuotationSort, type AdminQuotationStatus } from "@/lib/adminQuotationFilters";
import { trpc } from "@/lib/trpc";
import { formatIndianCurrency, formatPlantSize } from "@shared/quotation";
import { ArrowUpRight, Download, ExternalLink, FilterX, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const statuses: readonly AdminQuotationStatus[] = ["all", "draft", "generated", "sent", "accepted", "expired"];

export default function AdminQuotationManager() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<AdminQuotationStatus>("all");
  const [creatorId, setCreatorId] = useState("");
  const [plantSize, setPlantSize] = useState("");
  const [dateRange, setDateRange] = useState<AdminDateRange>("30");
  const [sort, setSort] = useState<AdminQuotationSort>("newest");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const input = useMemo(() => buildAdminQuotationListInput({ query: debouncedSearch, status, creatorId, plantSize, dateRange, sort }), [creatorId, dateRange, debouncedSearch, plantSize, sort, status]);
  const list = trpc.quotations.list.useQuery(input);
  const creators = trpc.admin.userOptions.useQuery();
  const appliedFilterCount = Number(status !== "all") + Number(Boolean(creatorId)) + Number(Boolean(plantSize)) + Number(dateRange !== "all") + Number(Boolean(search));
  const reset = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setCreatorId("");
    setPlantSize("");
    setDateRange("30");
    setSort("newest");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-700"><SlidersHorizontal className="h-4 w-4" /></span><p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-700">Management worklist</p></div>
          <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight text-slate-950">Quotation control desk</h2>
          <p className="mt-1 text-sm text-slate-500">Find, prioritize, open, or export the solar quotations your team has generated.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">Matching quotations</p><p className="mt-0.5 text-xl font-extrabold text-slate-900">{list.isLoading ? "—" : (list.data?.total ?? 0).toLocaleString("en-IN")}</p></div>
          <Link href="/quotations" className="inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-900">Full register <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="relative block xl:col-span-2"><span className="sr-only">Search quotations</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customer, quotation number, or phone…" className="h-10 border-slate-200 bg-white pl-9 shadow-none" /></label>
        <label><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"><option value="all">All statuses</option>{statuses.filter(item => item !== "all").map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        <label className="relative block"><span className="sr-only">Filter by creator</span><UserRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><select value={creatorId} onChange={event => setCreatorId(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-700"><option value="">All creators</option>{creators.data?.map(account => <option key={account.id} value={account.id}>{account.name || account.email || `User ${account.id}`}</option>)}</select></label>
        <label><span className="sr-only">Filter by plant size in kilowatts</span><Input value={plantSize} onChange={event => setPlantSize(event.target.value)} inputMode="decimal" placeholder="Plant size kW" className="h-10 border-slate-200 bg-white shadow-none" /></label>
        <label><span className="sr-only">Filter by date range</span><select value={dateRange} onChange={event => setDateRange(event.target.value as AdminDateRange)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">{adminDateRanges.map(range => <option key={range.value} value={range.value}>{range.label}</option>)}</select></label>
        <label><span className="sr-only">Sort quotations</span><select value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest_cost">Highest value</option><option value="lowest_cost">Lowest value</option><option value="customer_name">Customer A–Z</option></select></label>
        <Button variant="outline" onClick={reset} disabled={appliedFilterCount === 0 && sort === "newest"} className="h-10 gap-2 border-slate-200 bg-white text-slate-600"><FilterX className="h-4 w-4" />Reset</Button>
      </div>

      {list.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : list.isError ? <div className="px-5 py-10 text-center"><p className="font-bold text-rose-800">Quotation worklist could not be loaded.</p><Button variant="outline" onClick={() => list.refetch()} className="mt-3 border-rose-200 text-rose-700">Retry</Button></div> : list.data?.items.length ? <div className="divide-y divide-slate-100">{list.data.items.map(({ quotation, creatorName }) => <div key={quotation.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.6fr)_minmax(0,.7fr)_minmax(0,.75fr)_auto] lg:items-center">
        <div className="min-w-0"><p className="truncate font-bold text-slate-800">{quotation.customerName}</p><p className="mt-0.5 text-xs font-semibold text-sky-700">{quotation.quotationNumber}<span className="ml-1 font-normal text-slate-400">• {creatorName || "Roshni user"}</span></p></div>
        <div><p className="font-bold text-slate-800">{formatPlantSize(quotation.plantSizeKw)}</p><p className="mt-0.5 text-xs text-slate-500">{quotation.panelName}</p></div>
        <p className="font-bold text-slate-800">{formatIndianCurrency(quotation.plantCost)}</p>
        <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${quotation.status === "accepted" ? "bg-emerald-50 text-emerald-700" : quotation.status === "generated" ? "bg-sky-50 text-sky-700" : quotation.status === "sent" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{quotation.status}</span><p className="mt-1 text-xs text-slate-400">{new Date(quotation.quotationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
        <div className="flex items-center gap-1"><Link href={`/quotations/${quotation.id}`} title={`Open ${quotation.quotationNumber}`}><button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-sky-50 hover:text-sky-700"><ExternalLink className="h-4 w-4" /></button></Link><Link href={`/quotations/${quotation.id}?export=pdf`} title={`Export ${quotation.quotationNumber} as PDF`}><button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><Download className="h-4 w-4" /></button></Link></div>
      </div>)}</div> : <div className="px-5 py-12 text-center"><p className="font-bold text-slate-800">No quotations match these controls.</p><p className="mt-1 text-sm text-slate-500">Clear one or more filters to see the quotation worklist.</p><Button variant="outline" onClick={reset} className="mt-4 border-sky-200 text-sky-800">Clear filters</Button></div>}
    </section>
  );
}
