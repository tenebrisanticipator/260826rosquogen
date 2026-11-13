import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "roshni-solar-quotation";
}

async function waitForDocumentAssets(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map(image => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>(resolve => {
      const done = () => resolve();
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
      window.setTimeout(done, 4000);
    });
  }));
  await document.fonts?.ready;
}

const unsupportedColor = /oklch|oklab|color-mix|lab\(|lch\(/i;

function toRgbColor(color: string, fallback: string) {
  if (!unsupportedColor.test(color)) return color;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return fallback;
  context.fillStyle = "#000000";
  context.fillStyle = color;
  return context.fillStyle || fallback;
}

function rewriteUnsupportedColors(root: HTMLElement) {
  const properties: Array<[keyof CSSStyleDeclaration, string, string]> = [
    ["color", "color", "#0f172a"],
    ["backgroundColor", "background-color", "#ffffff"],
    ["borderTopColor", "border-top-color", "#cbd5e1"],
    ["borderRightColor", "border-right-color", "#cbd5e1"],
    ["borderBottomColor", "border-bottom-color", "#cbd5e1"],
    ["borderLeftColor", "border-left-color", "#cbd5e1"],
  ];

  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const element of elements) {
    const computed = window.getComputedStyle(element);
    for (const [computedKey, cssName, fallback] of properties) {
      const value = String(computed[computedKey] ?? "");
      if (unsupportedColor.test(value)) {
        element.style.setProperty(cssName, toRgbColor(value, fallback));
      }
    }
  }
}

export function quotationPdfFilename(quotationNumber: string, customerName: string) {
  return `${safeFilename(quotationNumber)}-${safeFilename(customerName)}.pdf`;
}

export async function completeQuotationPdfExport(options: {
  root: HTMLElement;
  quotationNumber: string;
  customerName: string;
  wasPreviouslyGenerated: boolean;
  markGenerated: () => Promise<unknown>;
  createPdf?: (root: HTMLElement, quotationNumber: string, customerName: string) => Promise<void>;
}) {
  const createPdf = options.createPdf ?? downloadQuotationPdf;
  await createPdf(options.root, options.quotationNumber, options.customerName);
  if (!options.wasPreviouslyGenerated) await options.markGenerated();
}

export async function downloadQuotationPdf(root: HTMLElement, quotationNumber: string, customerName: string) {
  const pages = Array.from(root.querySelectorAll<HTMLElement>(".quote-page"));
  if (!pages.length) throw new Error("The quotation preview is not ready yet.");

  await waitForDocumentAssets(root);

  const stage = document.createElement("div");
  stage.setAttribute("data-pdf-stage", "true");
  stage.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;background:#ffffff;z-index:-1;pointer-events:none;";
  document.body.appendChild(stage);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  try {
    for (let index = 0; index < pages.length; index += 1) {
      const clone = pages[index]!.cloneNode(true) as HTMLElement;
      clone.style.cssText = "width:794px;height:1123px;transform:none;margin:0;box-shadow:none;overflow:hidden;background:#ffffff;position:relative;";
      stage.replaceChildren(clone);
      rewriteUnsupportedColors(clone);
      await waitForDocumentAssets(clone);

      const canvas = await html2canvas(clone, {
        backgroundColor: "#ffffff",
        logging: false,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 5000,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });
      const image = canvas.toDataURL("image/jpeg", 0.92);
      if (index > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(image, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    pdf.save(quotationPdfFilename(quotationNumber, customerName));
  } finally {
    stage.remove();
  }
}
