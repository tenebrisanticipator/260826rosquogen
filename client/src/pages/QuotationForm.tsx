import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PANEL_TYPES, calculatePlantSizeKw, formatIndianCurrency, formatPlantSize } from "@shared/quotation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, ChevronLeft, FileText, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";
import { z } from "zod";

const schema = z.object({
  customerName: z.string().trim().min(2, "Enter the customer name."),
  customerAddress: z.string().max(2000).optional(),
  customerPhone: z.string().trim().regex(/^(?:\+?91|0)?[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
  panelName: z.string().trim().min(2, "Enter the panel brand."),
  panelType: z.string().min(1, "Select a panel type."),
  panelTypeOther: z.string().optional(),
  panelWatt: z.number().int().positive("Panel watt must be greater than zero."),
  numberOfPanels: z.number().int().positive("Number of panels must be greater than zero."),
  inverterCompany: z.string().trim().min(2, "Enter the inverter company."),
  plantCost: z.number().positive("Plant cost must be greater than zero."),
  quotationDate: z.string(),
}).superRefine((value, context) => {
  if (value.panelType === "Other" && !value.panelTypeOther?.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["panelTypeOther"], message: "Specify the panel type." });
});
type Values = z.infer<typeof schema>;
const fieldClass = "mt-1.5 h-11 border-slate-200 bg-white shadow-none focus-visible:border-sky-500 focus-visible:ring-sky-500";

function ErrorText({ text }: { text?: string }) { return text ? <p className="mt-1.5 text-xs font-medium text-rose-600">{text}</p> : null; }
function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400">{label}</p><p className={`mt-1 text-sm font-bold ${accent ? "text-sky-700" : "text-slate-800"}`}>{value}</p></div>; }

export default function QuotationForm() {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/quotations/:id/edit");
  const quotationId = Number(routeParams?.id);
  const isEditing = Number.isFinite(quotationId);
  const existing = trpc.quotations.getById.useQuery({ id: quotationId }, { enabled: isEditing });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { customerName: "", customerAddress: "", customerPhone: "", panelName: "", panelType: "Mono", panelTypeOther: "", panelWatt: 540, numberOfPanels: 1, inverterCompany: "", plantCost: 0, quotationDate: new Date().toISOString().slice(0, 10) } });
  useEffect(() => {
    const quotation = existing.data?.quotation;
    if (!quotation) return;
    form.reset({
      customerName: quotation.customerName,
      customerAddress: quotation.customerAddress || "",
      customerPhone: quotation.customerPhone,
      panelName: quotation.panelName,
      panelType: quotation.panelType,
      panelTypeOther: quotation.panelTypeOther || "",
      panelWatt: quotation.panelWatt,
      numberOfPanels: quotation.numberOfPanels,
      inverterCompany: quotation.inverterCompany,
      plantCost: Number(quotation.plantCost),
      quotationDate: new Date(quotation.quotationDate).toISOString().slice(0, 10),
    });
  }, [existing.data, form]);
  const values = form.watch();
  const plantSize = useMemo(() => calculatePlantSizeKw(values.panelWatt, values.numberOfPanels), [values.panelWatt, values.numberOfPanels]);
  const create = trpc.quotations.create.useMutation({ onSuccess: result => { toast.success(`Quotation ${result.quotationNumber} saved.`); setLocation(`/quotations/${result.id}`); }, onError: error => toast.error(error.message) });
  const update = trpc.quotations.update.useMutation({ onSuccess: () => { toast.success("Quotation updated."); setLocation(`/quotations/${quotationId}`); }, onError: error => toast.error(error.message) });
  const errors = form.formState.errors;
  const onSubmit = (data: Values) => {
    const payload = { ...data, quotationDate: new Date(`${data.quotationDate}T00:00:00`), panelTypeOther: data.panelTypeOther || undefined };
    if (isEditing) update.mutate({ id: quotationId, data: payload }); else create.mutate(payload);
  };

  return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Link href="/quotations" className="inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-900"><ChevronLeft className="h-4 w-4" />All quotations</Link><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950">{isEditing ? "Edit quotation" : "Create quotation"}</h1><p className="mt-1 text-sm text-slate-600">Plant size updates automatically. The verified quotation number is assigned securely when you save.</p></div><div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-right"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700">Quotation date</p><p className="mt-0.5 text-sm font-bold text-slate-800">{values.quotationDate}</p></div></div><form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]"><div className="space-y-5"><Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="font-display text-lg">Customer details</CardTitle></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="customerName">Customer name</Label><Input id="customerName" className={fieldClass} {...form.register("customerName")} /><ErrorText text={errors.customerName?.message} /></div><div><Label htmlFor="customerPhone">Phone number</Label><Input id="customerPhone" type="tel" placeholder="98765 43210" className={fieldClass} {...form.register("customerPhone")} /><ErrorText text={errors.customerPhone?.message} /></div><div><Label htmlFor="quotationDate">Quotation date</Label><Input id="quotationDate" type="date" className={fieldClass} {...form.register("quotationDate")} /></div><div className="sm:col-span-2"><Label htmlFor="customerAddress">Address <span className="font-normal text-slate-400">(optional)</span></Label><Textarea id="customerAddress" rows={3} className="mt-1.5 border-slate-200 shadow-none focus-visible:border-sky-500 focus-visible:ring-sky-500" {...form.register("customerAddress")} /></div></CardContent></Card><Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="font-display text-lg">Solar system</CardTitle></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2"><div><Label htmlFor="panelName">Panel name</Label><Input id="panelName" placeholder="e.g. Waaree" className={fieldClass} {...form.register("panelName")} /><ErrorText text={errors.panelName?.message} /></div><div><Label htmlFor="panelType">Panel type</Label><select id="panelType" className={`${fieldClass} w-full rounded-md px-3 text-sm`} {...form.register("panelType")}>{DEFAULT_PANEL_TYPES.map(type => <option key={type}>{type}</option>)}</select></div>{values.panelType === "Other" && <div className="sm:col-span-2"><Label htmlFor="panelTypeOther">Specify panel type</Label><Input id="panelTypeOther" className={fieldClass} {...form.register("panelTypeOther")} /><ErrorText text={errors.panelTypeOther?.message} /></div>}<div><Label htmlFor="panelWatt">Panel watt <span className="text-slate-400">(W)</span></Label><Input id="panelWatt" type="number" min="1" className={fieldClass} {...form.register("panelWatt", { valueAsNumber: true })} /><ErrorText text={errors.panelWatt?.message} /></div><div><Label htmlFor="numberOfPanels">Number of panels</Label><Input id="numberOfPanels" type="number" min="1" className={fieldClass} {...form.register("numberOfPanels", { valueAsNumber: true })} /><ErrorText text={errors.numberOfPanels?.message} /></div><div className="sm:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-700" /><p className="text-xs font-extrabold uppercase tracking-[.15em] text-emerald-700">Calculated plant size</p></div><p className="mt-1 font-display text-2xl font-extrabold text-emerald-950">{formatPlantSize(plantSize)}</p><p className="mt-1 text-xs text-emerald-800">{values.panelWatt.toLocaleString("en-IN")} W × {values.numberOfPanels.toLocaleString("en-IN")} panels ÷ 1,000</p></div></CardContent></Card><Card className="border-slate-200/80 shadow-sm"><CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="font-display text-lg">Inverter & pricing</CardTitle></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2"><div><Label htmlFor="inverterCompany">Inverter company</Label><Input id="inverterCompany" placeholder="e.g. Solis" className={fieldClass} {...form.register("inverterCompany")} /><ErrorText text={errors.inverterCompany?.message} /></div><div><Label htmlFor="plantCost">Plant cost <span className="text-slate-400">(₹)</span></Label><Input id="plantCost" type="number" min="1" placeholder="226000" className={fieldClass} {...form.register("plantCost", { valueAsNumber: true })} /><ErrorText text={errors.plantCost?.message} /></div></CardContent></Card></div><aside className="xl:sticky xl:top-8 xl:self-start"><Card className="overflow-hidden border-slate-200 shadow-[0_18px_40px_rgba(15,70,100,.1)]"><div className="h-1.5 bg-gradient-to-r from-sky-700 via-amber-400 to-emerald-500" /><CardContent className="p-5"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-sky-700"><Sparkles className="h-4 w-4" /></span><div><p className="font-display font-bold text-slate-900">Live quotation summary</p><p className="text-xs text-slate-500">Updates as you type</p></div></div><div className="mt-6 space-y-4"><Summary label="Customer" value={values.customerName || "Not specified"} /><Summary label="Quotation number" value={isEditing ? (existing.data?.quotation.quotationNumber || "Loading…") : "Assigned automatically on save"} accent /><Summary label="Plant size" value={formatPlantSize(plantSize)} /><Summary label="Panels" value={`${values.numberOfPanels || 0} × ${values.panelWatt || 0} W`} /><Summary label="Inverter" value={values.inverterCompany || "Not specified"} /><div className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-200">Plant cost</p><p className="mt-1 font-display text-xl font-extrabold">{formatIndianCurrency(values.plantCost)}</p></div></div><Button type="submit" disabled={create.isPending || update.isPending || existing.isLoading} className="mt-6 h-11 w-full gap-2 bg-sky-700 text-white hover:bg-sky-800"><Save className="h-4 w-4" />{create.isPending || update.isPending ? "Saving…" : isEditing ? "Save changes" : "Save quotation"}</Button><p className="mt-3 text-center text-xs leading-5 text-slate-500"><FileText className="mr-1 inline h-3.5 w-3.5" />A branded printable preview becomes available after saving.</p></CardContent></Card></aside></form></div>;
}
