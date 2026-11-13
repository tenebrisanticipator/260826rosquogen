import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import QuotationDocument from "@/components/QuotationDocument";
import { completeQuotationPdfExport } from "@/lib/exportQuotationPdf";
import { trpc } from "@/lib/trpc";
import { buildWhatsAppUrl, formatIndianCurrency, formatPlantSize } from "@shared/quotation";
import { ChevronLeft, Download, FileText, Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute, useSearch } from "wouter";

function Info({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">{label}</p><p className={`mt-1 text-sm font-bold ${emphasis ? "text-sky-800" : "text-slate-800"}`}>{value}</p></div>;
}

export default function QuotationDetail() {
  const [, params] = useRoute("/quotations/:id");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const id = Number(params?.id);
  const detail = trpc.quotations.getById.useQuery({ id }, { enabled: Number.isFinite(id) });
  const utils = trpc.useUtils();
  const [isExporting, setIsExporting] = useState(false);
  const autoExported = useRef<number | null>(null);
  const generated = trpc.quotations.markGenerated.useMutation({ onSuccess: () => utils.quotations.getById.invalidate({ id }) });
  const remove = trpc.quotations.delete.useMutation({ onSuccess: () => { toast.success("Quotation deleted."); setLocation("/quotations"); } });

  const exportPdf = useCallback(async () => {
    const quotation = detail.data?.quotation;
    const root = document.getElementById("quotation-export-root");
    if (!quotation || !root) {
      toast.error("The quotation preview is still loading. Please try again in a moment.");
      return;
    }
    try {
      setIsExporting(true);
      await completeQuotationPdfExport({ root, quotationNumber: quotation.quotationNumber, customerName: quotation.customerName, wasPreviouslyGenerated: Boolean(quotation.pdfGeneratedAt), markGenerated: () => generated.mutateAsync({ id }) });
      toast.success("PDF downloaded and ready to share with the client.");
      if (new URLSearchParams(window.location.search).get("export") === "pdf") {
        setLocation(`/quotations/${id}`, { replace: true });
      }
    } catch (error) {
      console.error("[Quotation PDF] Export failed", error);
      toast.error("The PDF could not be created. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [detail.data?.quotation, generated, id]);

  const shouldAutoExport = new URLSearchParams(search).get("export") === "pdf";
  useEffect(() => {
    if (!shouldAutoExport || !detail.data || autoExported.current === id) return;
    autoExported.current = id;
    const timer = window.setTimeout(() => { void exportPdf(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [detail.data, exportPdf, id, shouldAutoExport]);

  if (detail.isLoading) return <div className="space-y-4"><div className="h-8 w-40 animate-pulse rounded bg-slate-200" /><div className="h-64 animate-pulse rounded-2xl bg-slate-200" /></div>;
  if (!detail.data) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-rose-800">Quotation was not found or you do not have access to it.</div>;

  const q = detail.data.quotation;
  const whatsapp = () => {
    const url = buildWhatsAppUrl(q.customerPhone, `Hello ${q.customerName}, your Roshni Solar quotation ${q.quotationNumber} is ready.`);
    if (!url) return toast.error("A valid Indian mobile number is required.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return <div className="space-y-6"><div className="flex flex-col gap-4"><Link href="/quotations" className="inline-flex w-fit items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-900"><ChevronLeft className="h-4 w-4" />All quotations</Link><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-extrabold text-sky-700">{q.quotationNumber}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">{q.status}</span></div><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950">{q.customerName}</h1><p className="mt-1 text-sm text-slate-600">Created {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} • {detail.data.creatorName || "Roshni Solar"}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={whatsapp} className="gap-2 border-emerald-200 text-emerald-700"><MessageCircle className="h-4 w-4" />WhatsApp</Button><Link href={`/quotations/${id}/edit`}><Button variant="outline" className="gap-2 border-slate-200 text-slate-700"><Pencil className="h-4 w-4" />Edit</Button></Link><Button onClick={exportPdf} disabled={isExporting} className="gap-2 bg-sky-700 text-white hover:bg-sky-800"><Download className="h-4 w-4" />{isExporting ? "Creating PDF…" : "Download PDF"}</Button></div></div></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-5"><Card className="border-slate-200/80 shadow-sm"><CardContent className="grid gap-6 p-5 sm:grid-cols-2"><Info label="Customer" value={q.customerName} /><Info label="Phone" value={`+${q.customerPhone}`} /><Info label="Address" value={q.customerAddress || "Not provided"} /><Info label="Panel" value={`${q.panelName} • ${q.panelTypeOther || q.panelType}`} /><Info label="Configuration" value={`${q.numberOfPanels} × ${q.panelWatt} W`} /><Info label="Plant size" value={formatPlantSize(q.plantSizeKw)} emphasis /><Info label="Inverter" value={q.inverterCompany} /><Info label="Plant cost" value={formatIndianCurrency(q.plantCost)} emphasis /></CardContent></Card><div id="quotation-export-root" className="rounded-2xl border border-slate-200/80 bg-slate-100 p-3 shadow-sm sm:p-6"><QuotationDocument quotation={q} /></div></div><aside className="space-y-4 no-print"><Card className="border-slate-200/80 shadow-sm"><CardContent className="p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">Document status</p><p className="mt-2 font-display text-xl font-extrabold text-slate-900">{q.pdfGeneratedAt ? "PDF prepared" : "Ready to export"}</p><p className="mt-2 text-sm leading-5 text-slate-600">Six branded quotation pages can be downloaded as a shareable PDF with the proposal visuals and commercial details.</p><Button disabled={isExporting} className="mt-5 w-full gap-2 bg-sky-700 text-white hover:bg-sky-800" onClick={exportPdf}>{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{isExporting ? "Creating PDF…" : "Export branded PDF"}</Button></CardContent></Card><Card className="border-rose-100 bg-rose-50/40 shadow-none"><CardContent className="p-5"><p className="font-bold text-rose-800">Danger zone</p><p className="mt-1 text-sm leading-5 text-rose-700">Deleting removes this quotation and its activity reference.</p><Button variant="outline" onClick={() => { if (confirm(`Delete ${q.quotationNumber}?`)) remove.mutate({ id }); }} className="mt-4 w-full gap-2 border-rose-200 bg-white text-rose-700 hover:bg-rose-100"><Trash2 className="h-4 w-4" />Delete quotation</Button></CardContent></Card></aside></div></div>;
}
