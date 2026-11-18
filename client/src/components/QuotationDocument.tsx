import React from "react";
import { formatIndianCurrency, formatPlantSize } from "@shared/quotation";

type Quote = {
  quotationNumber: string;
  customerName: string;
  customerAddress: string | null;
  customerPhone: string;
  panelName: string;
  panelType: string;
  panelTypeOther: string | null;
  panelWatt: number;
  numberOfPanels: number;
  plantSizeKw: string | number;
  inverterCompany: string;
  plantCost: string | number;
  quotationDate: Date | string;
};

const portableAssetBase = import.meta.env.VITE_QUOTATION_ASSET_BASE?.replace(/\/$/, "");
const assetPath = (portableName: string, managedPath: string) =>
  portableAssetBase ? `${portableAssetBase}/${portableName}` : managedPath;

const asset = {
  logo: assetPath("roshni-solar-official-logo.png", "/manus-storage/roshni-solar-official-logo_87b2cdbc.png"),
  cloud: assetPath("cloud-background.jpeg", "/manus-storage/image1_fd1aa5f0.jpeg"),
  diagram: assetPath("grid-system-diagram.jpeg", "/manus-storage/image47_c5bff833.jpeg"),
  heater: assetPath("solar-water-heater.png", "/manus-storage/image14_f18ec65f.png"),
  savings: assetPath("solar-savings.jpeg", "/manus-storage/image2_42dfc9ea.jpeg"),
  seal: assetPath("roshni-seal.png", "/manus-storage/image61_c2ac8faf.png"),
  distributor: assetPath("authorised-distributor.png", "/manus-storage/image15_aed2b0e2.png"),
  heaterWords: assetPath("delight-solar-water-heater.png", "/manus-storage/image17_baac6d67.png"),
  dimanWords: assetPath("diman-overseas.png", "/manus-storage/image18_7a5adc5e.png"),
  star: assetPath("footer-star.png", "/manus-storage/image19_c6f99d7b.png"),
  productSheet: assetPath("reference-4.png", "/manus-storage/reference-4_db99f349.png"),
  warrantySheet: assetPath("reference-5.png", "/manus-storage/reference-5_48bb1a3a.png"),
  finalSheet: assetPath("reference-6.png", "/manus-storage/reference-6_387aedec.png"),
};

function Header({ q }: { q: Quote }) {
  return (
    <>
      <div className="doc-swoosh">
        <img
          src={asset.logo}
          crossOrigin="anonymous"
          alt="Official Roshni Solar logo"
          className="doc-official-logo"
        />
        <span className="doc-brand">Roshni Solar</span>
      </div>
      <div className="flex items-end justify-between px-7 pt-2">
        <p className="text-[11px] font-bold leading-3 text-sky-900">
          SOLAR ENERGY PROPOSAL
        </p>
        <p className="text-right text-[10px] font-semibold text-slate-600">
          Quotation No. {q.quotationNumber}
        </p>
      </div>
    </>
  );
}

function Footer({ number }: { number: number }) {
  return (
    <footer className="quote-footer relative mt-auto flex min-h-[58px] items-end justify-between overflow-hidden border-t-2 border-sky-500 bg-white/70 px-6 py-2">
      <img
        src={asset.heater}
        crossOrigin="anonymous"
        alt="Solar water heater"
        className="h-12 w-[92px] object-contain object-left"
      />
      <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1.5 text-[8px] font-extrabold text-slate-700">
        <span className="text-red-600 font-sans">★</span>
        <span className="text-red-600">Authorized Distributor Of</span>
        <span className="text-red-600 font-sans">★</span>
        <span>Delight Solar Water Heater</span>
        <span className="text-red-600 font-sans">★</span>
        <span>DIMAN Overseas Pvt. Ltd.</span>
      </div>
      <img
        src={asset.savings}
        crossOrigin="anonymous"
        alt="Solar savings"
        className="h-12 w-21 object-cover"
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-slate-400">
        Page {number} of 6
      </span>
    </footer>
  );
}

function FirstPageHighlights({ q }: { q: Quote }) {
  return (
    <section className="mx-7 mt-3 grid grid-cols-3 divide-x divide-sky-100 overflow-hidden rounded-md border border-sky-200 bg-white/80 text-center">
      <div className="px-2 py-2">
        <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-sky-700">
          System capacity
        </p>
        <p className="mt-1 font-bold text-slate-900">
          {formatPlantSize(q.plantSizeKw)}
        </p>
      </div>
      <div className="px-2 py-2">
        <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-sky-700">
          Energy approach
        </p>
        <p className="mt-1 font-bold text-slate-900">Grid-tied rooftop</p>
      </div>
      <div className="px-2 py-2">
        <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-sky-700">
          Proposal scope
        </p>
        <p className="mt-1 font-bold text-slate-900">
          Supply to commissioning
        </p>
      </div>
    </section>
  );
}

function Page({
  q,
  number,
  children,
}: {
  q: Quote;
  number: number;
  children: React.ReactNode;
}) {
  return (
    <article className="quote-page relative overflow-hidden bg-white text-slate-900 shadow-xl">
      <img
        src={asset.cloud}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35 pointer-events-none"
      />
      <div className="relative flex min-h-full flex-col">
        <Header q={q} />
        {number === 1 && <FirstPageHighlights q={q} />}
        {children}
        <Footer number={number} />
      </div>
    </article>
  );
}

function Cell({
  children,
  highlight,
  colSpan,
  rowSpan,
  className = "",
}: {
  children: React.ReactNode;
  highlight?: boolean;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-slate-500 px-1.5 py-[2px] align-top text-[9px] leading-[1.18] ${
        highlight ? "bg-yellow-200 font-bold" : "bg-white/60"
      } ${className}`}
    >
      {children}
    </td>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr>
      <Cell>{label}</Cell>
      <Cell highlight={highlight}>{value}</Cell>
    </tr>
  );
}

function ReferencePage({
  src,
  alt,
  number,
}: {
  src: string;
  alt: string;
  number: number;
}) {
  return (
    <>
      <article className="quote-page relative overflow-hidden bg-[#d9edf8] shadow-xl">
        <img
          src={src}
          crossOrigin="anonymous"
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-2 py-0.5 text-[8px] text-slate-500">
          Page {number} of 6
        </span>
      </article>
      {number === 5 && (
        <article className="quote-page relative overflow-hidden bg-[#d9edf8] shadow-xl">
          <img
            src={asset.finalSheet}
            crossOrigin="anonymous"
            alt="Final source product and warranty reference sheet"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-2 py-0.5 text-[8px] text-slate-500">
            Page 6 of 6
          </span>
        </article>
      )}
    </>
  );
}

export default function QuotationDocument({ quotation: q }: { quotation: Quote }) {
  const plantSize = Number(q.plantSizeKw);
  const cost = Number(q.plantCost);
  const subsidy = plantSize >= 3 ? 78000 : Math.round(plantSize * 18000);
  const effectiveCost = Math.max(0, cost - subsidy);
  const annualGeneration = Math.round(plantSize * 1500);
  const annualSaving = Math.round(annualGeneration * 8.5);
  const payback = annualSaving ? effectiveCost / annualSaving : 0;
  const area = Math.round(plantSize * 90);
  const date = new Date(q.quotationDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const panelType = q.panelTypeOther || q.panelType;

  return (
    <div className="quote-document-grid space-y-5">
      <Page q={q} number={1}>
        <main className="px-7 pt-5 text-[9px] leading-[1.28]">
          <div className="grid grid-cols-[.48fr_1.52fr] gap-3 font-semibold">
            <div>
              <p>To. Dear Sir</p>
              <p className="mt-1">DATE: {date}</p>
              <p>VADODARA.</p>
            </div>
            <div>
              <p>NAME - {q.customerName.toUpperCase()}</p>
              <p>
                Sub: Quotation for{" "}
                <mark className="bg-yellow-200 px-0.5 font-extrabold">
                  {formatPlantSize(q.plantSizeKw)}
                </mark>{" "}
                Solar Rooftop System for 2026-27
              </p>
              <p className="text-[8px] text-slate-600">
                (THIS QUOTATION IS BASED ON THE 2023-24 SOLAR RATES (NORM))
              </p>
              <p>
                ADD- {q.customerAddress || "Customer site address to be confirmed"}
              </p>
            </div>
          </div>
          <p className="mt-3">Dear Sir,</p>
          <p className="mt-2 text-justify">
            At the beginning, we would like to express our sincere thanks to you
            for providing us opportunity to submit our proposal on the subject
            matter.{" "}
            <mark className="bg-yellow-200 font-extrabold">ROSHNI ENTERPRISE</mark>{" "}
            is an energy solution provider since 2012. We are Authorized Dealers
            for <mark className="bg-yellow-200 font-extrabold">{q.panelName.toUpperCase()}</mark>{" "}
            and provide solutions in entire solar spectrum from concept to
            commissioning (C2C cycle) for EPC of grid connected solar PV plants
            in utility and kW scale, rooftop solar systems, solar PV equipment,
            solar street lights, solar lanterns, solar water heaters, solar air
            heaters and solar desalination.
          </p>
          <h3 className="mt-3 font-extrabold">INTRODUCTION</h3>
          <p className="text-justify">
            India has an abundance of sunshine and the trend of depletion of
            fossil fuels is compelling the energy plan to examine feasibility of
            using renewable source of energy like Solar and Wind. We have been
            active in Solar Photovoltaic and are positioned to set MW scale SPV
            Power Plants. This writes up describes a typical Solar Grid Connected
            Rooftop Power Plant for captive consumption.
          </p>
          <h3 className="mt-3 font-extrabold">SYSTEM CONCEPT</h3>
          <p>The Photovoltaic (PV) Grid Tied system consists mainly of 3 components:</p>
          <ul className="mt-1 list-disc pl-4">
            <li>The Crystal line Silicon PV array</li>
            <li>Solar Inverter (Power Conditioning Unit)</li>
            <li>BOS like MMB, AJB, MJB, ACDB, Cables, Hardware, Earthing & Lightning kit</li>
          </ul>
          <p className="mt-2 text-justify">
            Crystal line silicon Modules are of high efficiency and will convert
            Sun Light into Electricity. The power generated by the Solar array
            needs to be conditioned in respect of voltage, phase and frequency
            to make it Grid-Tied. The Power Conditioning Unit used in grid
            connected SPV systems consists of inverter and other electronics for
            MPPT, synchronization and remote monitoring. If the load demand is
            more than the SPV generation, the balance is met by grid supply;
            when it is lower, excess solar power is fed to the grid. In grid
            failure, the system shuts down automatically as per safety norms.
          </p>
        </main>
      </Page>

      <Page q={q} number={2}>
        <main className="px-7 pt-2">
          <img
            src={asset.diagram}
            crossOrigin="anonymous"
            alt="Solar photovoltaic grid tied system diagram"
            className="mx-auto h-20 w-auto max-w-full object-contain"
          />
          <table className="quote-table mt-1.5 w-full border-collapse">
            <tbody>
              <Row label="Solar plant type" value="On Grid (Grid Tied) System" />
              <Row
                label="Solar Plant Size"
                value={formatPlantSize(q.plantSizeKw)}
                highlight
              />
              <tr>
                <Cell rowSpan={4}>Solar Module</Cell>
                <Cell>
                  Panel Make{" "}
                  <mark className="bg-yellow-200 font-bold">
                    {q.panelName.toUpperCase()}
                  </mark>
                </Cell>
              </tr>
              <tr>
                <Cell highlight>
                  Size & Type: {q.panelWatt} W {panelType} • {q.numberOfPanels}{" "}
                  Panels
                </Cell>
              </tr>
              <tr>
                <Cell>Panel Performance Warranty: 30 Years</Cell>
              </tr>
              <tr>
                <Cell>System Warranty: 05 Years</Cell>
              </tr>
              <Row
                label="Inverter"
                value={
                  <>
                    <mark className="bg-yellow-200 font-bold">
                      {q.inverterCompany}
                    </mark>{" "}
                    India’s Most Preferred Solar Inverter Brand, 10 Years Warranty
                  </>
                }
                highlight
              />
              <Row
                label="Mounting Structure"
                value="Hot Dip Galvanized APOLLO Elegant 40×80×2mm & 40×40×2mm"
                highlight
              />
              <Row label="Cable" value="Polycab" highlight />
              <Row label="Earthing" value="As per Govt. Tender • E-LINK" />
              <Row
                label="Lightning Arrester"
                value="As per Govt. Tender • E-LINK"
              />
              <Row label="ACDB/DCDB" value="MCB-HAVELLS, SPD ELMEX" highlight />
              <Row
                label="Maintenance"
                value="5 Years Comprehensive Maintenance for complete system"
              />
            </tbody>
          </table>
          <p className="mt-1.5 text-[9px] font-semibold">
            Following are the required project details for your requirement:
            <br />
            Commercial Proposal:
          </p>
          <table className="quote-table mt-1 w-full border-collapse">
            <thead>
              <tr>
                <Cell className="w-[6%] text-center font-bold">No</Cell>
                <Cell className="w-[78%] text-center font-bold">
                  Description for Solar PV Plant
                </Cell>
                <Cell className="w-[16%] text-center font-bold">Amount</Cell>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Cell className="text-center">1</Cell>
                <Cell highlight>
                  <strong>NET PAYABLE AMOUNT</strong>
                  <br />
                  (With standard elevated structure includes subsidy,
                  installation, testing & commissioning, solar registration
                  fees, DISCOM TFR charges for connectivity, net meter, solar
                  meter, QCT, modem and testing charge.)
                </Cell>
                <Cell highlight className="text-center">
                  {formatIndianCurrency(cost)}
                </Cell>
              </tr>
              <tr>
                <Cell className="text-center">2</Cell>
                <Cell highlight>
                  <strong>Elevated Structure</strong>
                  <br />
                  Lower part of south side 2 meter (6–7ft), higher part of north
                  side (9–10ft) with legs, rafter 40×80×2mm and purlin 40×40×2mm
                  with hot dip galvanize and RCC work.
                </Cell>
                <Cell className="text-center font-bold">FREE</Cell>
              </tr>
              <tr>
                <Cell className="text-center">3</Cell>
                <Cell highlight>
                  <strong>Subsidy from Central Govt.</strong>
                  <br />
                  ₹30,000/- per kW up to 2 kW; ₹18,000/- per kW for additional
                  capacity up to 3 kW. Total subsidy for systems larger than 3
                  kW capped at ₹78,000.
                </Cell>
                <Cell highlight className="text-center">
                  {formatIndianCurrency(subsidy)}
                </Cell>
              </tr>
              <tr>
                <Cell className="text-center">4</Cell>
                <Cell highlight>
                  <strong>COST AFTER DEDUCTING SUBSIDY</strong>
                  <br />
                  The effective cost shown is net of applicable
                  central-government subsidy.
                </Cell>
                <Cell highlight className="text-center">
                  {formatIndianCurrency(effectiveCost)}
                </Cell>
              </tr>
              <tr>
                <Cell colSpan={3} highlight>
                  <mark className="bg-yellow-200 font-extrabold">
                    This system rate is based on {q.panelWatt} W solar panel. If
                    panel rating changes during purchasing, then system rate
                    also changes based on panel rating. If panel rating
                    increases, the total system cost increases and if it
                    decreases, the total system cost decreases.
                  </mark>
                </Cell>
              </tr>
            </tbody>
          </table>
        </main>
      </Page>

      <Page q={q} number={3}>
        <main className="flex flex-1 flex-col justify-between px-7 pt-4">
          <section>
            <h3 className="text-[11px] font-extrabold">Payback Calculation:</h3>
            <table className="quote-table mt-2 w-full border-collapse">
              <tbody>
                <Row label="Generation per year / kW" value="1500* Unit" />
                <Row
                  label="Generation for complete System"
                  value={`1500 × ${formatPlantSize(
                    q.plantSizeKw
                  )} ≈ ${annualGeneration.toLocaleString("en-IN")} Unit`}
                />
                <Row label="Average Cost per unit" value="Rs. 8.5*" />
                <Row
                  label="Saving against generation / year"
                  value={`Rs. 8.5 × ${annualGeneration.toLocaleString(
                    "en-IN"
                  )} Unit = ${formatIndianCurrency(annualSaving)}`}
                />
                <Row
                  label="Payback period"
                  value={`${formatIndianCurrency(
                    effectiveCost
                  )} / ${formatIndianCurrency(annualSaving)} ≈ ${payback.toFixed(
                    1
                  )} years`}
                />
                <Row
                  label="Area required for installation"
                  value={`${area.toLocaleString("en-IN")} Sq. Ft`}
                />
              </tbody>
            </table>
          </section>
          <section>
            <h3 className="text-[11px] font-extrabold">Terms and conditions:</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[9px] leading-[1.28]">
              <li>Life of Solar System will be 30 Years*</li>
              <li>
                <mark className="bg-yellow-200 font-bold">
                  Performance Warranty of Solar Panel: 90% power output after 10
                  Years and 80% power output after 30 Years
                </mark>
              </li>
              <li>Cleaning of Solar Panels will be in client’s scope.</li>
              <li>
                Design of solar plant once approved from client won’t be altered
                later. If client wants to amend the design, charges for the same
                will be in client’s scope.
              </li>
              <li>
                Rate are inclusive of GST, freight, DISCOM charges and five-year
                free service.
              </li>
              <li>
                <mark className="bg-yellow-200 font-bold">
                  Payment Terms: 1st payment 30% of Net Amount, 2nd payment 50%,
                  3rd payment 20%
                </mark>
              </li>
              <li>Offer Validity: One week from date of offer.</li>
              <li>Maintenance cost in any natural hazard will be extra.</li>
            </ul>
          </section>
          <section>
            <p className="text-[9px]">
              Hope our offer is inline of your requirement. We will be happy to
              receive your valuable order.
            </p>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 text-[9px]">
              <div>
                <p className="font-extrabold">NAME - Roshni enterprise</p>
                <p>Bank - HDFC bank</p>
                <p>A/c no - 0251873000081 &nbsp; IFSC - HDFC0009473</p>
                <p>BRANCH-OMNAGAR, TARSALI, VADODARA.</p>
                <p>GST NO - 24ALEPP4601L1Z6.</p>
              </div>
              <div className="text-center">
                <img
                  src={asset.seal}
                  crossOrigin="anonymous"
                  alt="Roshni Enterprise seal and authorisation signature"
                  className="mx-auto h-14 w-auto object-contain"
                />
                <p className="mt-1">For ROSHNI ENTERPRISE</p>
              </div>
            </div>
          </section>
        </main>
      </Page>

      <ReferencePage
        src={asset.productSheet}
        alt="Solar inverter, module, protection device, cable, structure and clamp reference sheet"
        number={4}
      />
      <ReferencePage
        src={asset.warrantySheet}
        alt="Earthing, warranty, MC4 connector, lightning arrester and conduit reference sheet"
        number={5}
      />
    </div>
  );
}
