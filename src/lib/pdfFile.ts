/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs/promises";
import path from "path";
import { Buffer } from "node:buffer";

/* ────────────────────────────────────────────────────────────────────────────
   Types communs (Devis + Contrat)
   ────────────────────────────────────────────────────────────────────────── */
export type QuoteItemMeta = { color?: string | null; partKind?: "back" | "frame" };
export type QuoteItem = { label: string; price: number; qty?: number; meta?: QuoteItemMeta };
export type QuoteDevice = { category?: string; model?: string; items: QuoteItem[] };

export type CompanyInfo = {
  name: string;
  slogan?: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  vat?: string;
};

export type ClientInfoLite = { firstName: string; lastName: string; email: string; phone: string };
export type Address = { street: string; number: string; postalCode: string; city: string };

export type Appointment = {
  dateISO?: string;
  slot?: string;
  startISO?: string;
  endISO?: string;
  appointmentDate?: string;
  appointmentSlot?: string;
  appointmentISO?: string; // tolérance
};

export type QuotePayload = {
  quoteNumber: string;
  dateISO: string;
  company: CompanyInfo;
  client: ClientInfoLite & { appointmentISO?: string }; // tolérance pour QuoteCard
  devices: Array<{ category?: string; model?: string; items: Array<{ label: string; price: number; qty?: number; meta?: QuoteItemMeta }> }>;
  travelFee?: number;
  payInTwo?: boolean;
  signatureDataUrl?: string | null;

  aDomicile?: boolean;
  address?: Address | null;
  appointment?: Appointment | null;

  // champs dupliqués tolérants
  appointmentDate?: string;
  appointmentSlot?: string;
  appointmentStartISO?: string;
  appointmentEndISO?: string;
  appointmentISO?: string;

  legal?: string[];
};

export type ContractPayload = {
  contractNumber: string;
  dateISO: string;
  company: CompanyInfo;
  client: ClientInfoLite & { appointmentISO?: string };

  devices: QuotePayload["devices"];
  travelFee?: number;

  signatureDataUrl?: string | null;
  deliveryDateISO?: string | null;

  aDomicile?: boolean;
  address?: Address | null;
  appointment?: Appointment | null;

  // champs dupliqués tolérants
  appointmentDate?: string;
  appointmentSlot?: string;
  appointmentStartISO?: string;
  appointmentEndISO?: string;
  appointmentISO?: string;
};

export type DocType = "quote" | "contract";

/* ────────────────────────────────────────────────────────────────────────────
   Mise en page & couleurs
   ────────────────────────────────────────────────────────────────────────── */
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 36;

const BRAND = hexToRgb("#54b435");
const BRAND_LIGHT = rgb(0.93, 0.98, 0.92);
const TEXT_DARK = rgb(0.10, 0.10, 0.10);
const TEXT_MUTE = rgb(0.40, 0.40, 0.40);
const RULE = rgb(0.88, 0.88, 0.88);

// colonnes tableau
const COLS = { title: 288, color: 140, qty: 40, price: 55 };

type Fonts = { reg: any; bold: any };

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.slice(0,2),16)/255,
    parseInt(h.slice(2,4),16)/255,
    parseInt(h.slice(4,6),16)/255
  );
}
function euro(v: number) {
  try { return new Intl.NumberFormat("fr-BE",{style:"currency",currency:"EUR"}).format(v); }
  catch { return `€ ${v.toFixed(2)}`; }
}
async function loadPublicPng(relPath: string): Promise<Uint8Array | null> {
  try {
    const file = path.join(process.cwd(), "public", relPath);
    const buf = await fs.readFile(file);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } catch { return null; }
}
function formatDate(d?: string) {
  try { return new Intl.DateTimeFormat("fr-BE",{year:"numeric",month:"2-digit",day:"2-digit"}).format(d?new Date(d):new Date()); }
  catch { return d ?? ""; }
}
function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("fr-BE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Brussels",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
function addDaysISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function wrapByWidth(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let buf = "";
  for (const w of words) {
    const probe = buf ? buf + " " + w : w;
    if (font.widthOfTextAtSize(probe, size) <= maxWidth) {
      buf = probe;
    } else {
      if (buf) lines.push(buf);
      buf = w;
    }
  }
  if (buf) lines.push(buf);
  return lines;
}

/* ────────────────────────────────────────────────────────────────────────────
   En-tête
   ────────────────────────────────────────────────────────────────────────── */
async function drawHeader(
  pdf: PDFDocument,
  page: any,
  fonts: Fonts,
  company: CompanyInfo,
  titleLabel: string,
  number: string,
  dateISO: string
): Promise<number> {
  const headerH = 64;
  const boxTop = PAGE_H - MARGIN;
  const boxBottom = boxTop - headerH;
  const centerY = (boxTop + boxBottom) / 2;

  const logoBytes =
    (await loadPublicPng("images/contents/logo_recophone.png")) ||
    (await loadPublicPng("logo_recophone.png")) ||
    (await loadPublicPng("logo.png"));
  if (logoBytes) {
    try {
      const png = await pdf.embedPng(logoBytes);
      const maxH = 40, maxW = 160;
      const scale = Math.min(maxH / png.height, maxW / png.width);
      const w = png.width * scale, h = png.height * scale;
      page.drawImage(png, { x: MARGIN, y: centerY - h/2, width: w, height: h });
    } catch {}
  }

  const title = `${titleLabel} ${number}`;
  const sub   = formatDate(dateISO);
  const titleSize = 14, subSize = 10;
  const titleW = fonts.bold.widthOfTextAtSize(title, titleSize);
  const subW   = fonts.reg.widthOfTextAtSize(sub, subSize);
  const titleY = centerY + 6, subY = titleY - (titleSize + 4);

  page.drawText(title, { x:(PAGE_W - titleW)/2, y: titleY - titleSize*0.35, size:titleSize, font:fonts.bold, color:TEXT_DARK });
  page.drawText(sub,   { x:(PAGE_W - subW)/2,   y: subY    - subSize*0.35,   size:subSize,   font:fonts.reg,  color:TEXT_MUTE });

  const infoLines = [
    company.name || "RecoPhone",
    company.vat ? `TVA : ${company.vat}` : "",
    company.email ? `Email : ${company.email}` : "",
    company.address || "",
  ].filter(Boolean);
  const rightEdge = PAGE_W - MARGIN;
  const blockH = infoLines.length * 12;
  let cy = centerY + blockH/2 - 9;
  for (const line of infoLines) {
    const w = fonts.reg.widthOfTextAtSize(line, 9);
    page.drawText(line, { x: rightEdge - w, y: cy, size: 9, font: fonts.reg, color: TEXT_MUTE });
    cy -= 12;
  }

  page.drawLine({ start:{x:MARGIN,y:boxBottom-8}, end:{x:PAGE_W-MARGIN,y:boxBottom-8}, thickness:1, color:RULE });
  return boxBottom - 18;
}

/* ────────────────────────────────────────────────────────────────────────────
   RDV super tolérant
   ────────────────────────────────────────────────────────────────────────── */
function pickAppt(anyData: any): { dateISO?: string; slot?: string } {
  const appt = anyData?.appointment || {};

  const topDate =
    anyData.appointmentDate ||
    anyData.appointmentISO ||
    anyData.appointmentStartISO ||
    appt.dateISO ||
    appt.appointmentDate ||
    appt.date ||
    appt.startISO ||
    anyData.client?.appointmentISO ||
    undefined;

  let dateISO: string | undefined = topDate;

  let slot: string | undefined =
    anyData.appointmentSlot ||
    appt.slot ||
    appt.appointmentSlot ||
    undefined;

  if (!slot) {
    const s = anyData.appointmentStartISO || appt.startISO || topDate || undefined;
    const e = anyData.appointmentEndISO   || appt.endISO   || undefined;
    if (s && e) slot = `${formatTime(s)}–${formatTime(e)}`;
    else if (s) slot = `${formatTime(s)}`;
    else if (topDate) slot = `${formatTime(topDate)}`;
  }

  return { dateISO, slot };
}

/* ────────────────────────────────────────────────────────────────────────────
   Cartes client (2 colonnes)
   ────────────────────────────────────────────────────────────────────────── */
function drawCard(page:any, fonts:Fonts, x:number, y:number, w:number, title:string, lines:string[]): number {
  const h = 22 + lines.length*12 + 12;
  page.drawRectangle({ x, y: y-h, width: w, height: h, color: rgb(1,1,1), borderColor:RULE, borderWidth:1 });
  page.drawRectangle({ x, y: y-22, width: w, height: 22, color: BRAND_LIGHT });
  page.drawText(title, { x:x+10, y:y-16, size:10, font:fonts.bold, color:TEXT_DARK });
  let cy = y-34;
  for (const line of lines) {
    page.drawText(line, { x:x+10, y:cy, size:9, font:fonts.reg, color:TEXT_MUTE });
    cy -= 12;
  }
  return y - h - 10;
}

async function drawClientCards(
  pdf: PDFDocument,
  fonts: Fonts,
  ctx: { page: any; y: number },
  data: QuotePayload | ContractPayload
): Promise<{ page: any; y: number }> {
  const cardW = (PAGE_W - MARGIN * 2 - 12) / 2;

  // ↙︎ récupère date & créneau depuis appointment / duplicatas (tolérant)
  const { dateISO, slot } = pickAppt(data as any); // utilise formatDate/formatTime existants

  // — Carte de gauche : Client —
  const leftLines = [
    `${data.client.firstName} ${data.client.lastName}`.trim(),
    data.client.email,
    data.client.phone,
  ].filter(Boolean);

  // ➕ Cas atelier : afficher la date choisie sous le client (pas d’heure)
  const isHome = "aDomicile" in data && !!data.aDomicile;
  if (!isHome && dateISO) {
    leftLines.push(`Date souhaitée : ${formatDate(dateISO)}`);
  }

  const yStart = ctx.y;
  let yL = drawCard(ctx.page, fonts, MARGIN, yStart, cardW, "Client", leftLines);
  let yR = yL;

  // — Carte de droite : Intervention à domicile —
  if (isHome) {
    const rightLines: string[] = [];
    if (data.address) {
      rightLines.push(
        `${data.address.street} ${data.address.number}`,
        `${data.address.postalCode} ${data.address.city}`
      );
    }
    if (dateISO) rightLines.push(`Date souhaitée : ${formatDate(dateISO)}`);
    if (slot)    rightLines.push(`Créneau : ${slot}`);
    if (rightLines.length === 0) rightLines.push("—");

    yR = drawCard(
      ctx.page,
      fonts,
      MARGIN + cardW + 12,
      yStart,
      cardW,
      "Intervention à domicile",
      rightLines
    );
  }

  return { page: ctx.page, y: Math.min(yL, yR) - 6 };
}

/* ────────────────────────────────────────────────────────────────────────────
   Tableau réparations
   ────────────────────────────────────────────────────────────────────────── */
function tableColXs(): number[] {
  const x = MARGIN;
  const c1 = x;
  const c2 = c1 + COLS.title;
  const c3 = c2 + COLS.color;
  const c4 = c3 + COLS.qty;
  return [c1, c2, c3, c4];
}

function drawRepairsHeader(page:any, fonts:Fonts, y:number): number {
  const [c1, c2, c3, c4] = tableColXs();
  const rowH = 22;

  page.drawRectangle({ x:MARGIN, y:y-rowH, width:(PAGE_W - MARGIN*2), height:rowH, color: BRAND_LIGHT });

  page.drawText("Intitulé de la réparation", { x:c1+8, y:y-14, size:9, font:fonts.bold, color:TEXT_DARK });
  page.drawText("Couleur",                    { x:c2+8, y:y-14, size:9, font:fonts.bold, color:TEXT_DARK });

  const unit="Unité", unitW = fonts.bold.widthOfTextAtSize(unit,9);
  page.drawText(unit, { x:c3 + (COLS.qty - unitW)/2, y:y-14, size:9, font:fonts.bold, color:TEXT_DARK });

  const price="Prix TTC", priceW = fonts.bold.widthOfTextAtSize(price,9);
  page.drawText(price, { x:c4 + COLS.price - 8 - priceW, y:y-14, size:9, font:fonts.bold, color:TEXT_DARK });

  page.drawLine({ start:{x:MARGIN,y:y-rowH}, end:{x:PAGE_W-MARGIN,y:y-rowH}, thickness:1, color:RULE });
  return y - rowH - 2;
}

function drawRepairsRow(
  page:any,
  fonts:Fonts,
  y:number,
  rowIndex:number,
  title:string,
  colorText:string,
  qty:number,
  price:number
): number {
  const [c1, c2, c3, c4] = tableColXs();
  const rowH = 20;

  if (rowIndex % 2 === 1) {
    page.drawRectangle({ x:MARGIN, y:y-rowH, width:(PAGE_W - MARGIN*2), height:rowH, color: rgb(0.99,0.99,0.99) });
  }

  const qtyStr = String(qty);
  const priceStr = euro(price);

  page.drawText(title,    { x:c1+8, y:y-14, size:9, font:fonts.reg, color:TEXT_DARK });
  page.drawText(colorText,{ x:c2+8, y:y-14, size:9, font:fonts.reg, color:TEXT_MUTE });

  const qtyW = fonts.reg.widthOfTextAtSize(qtyStr,9);
  page.drawText(qtyStr,   { x:c3 + (COLS.qty - qtyW)/2, y:y-14, size:9, font:fonts.reg, color:TEXT_DARK });

  const priceW = fonts.reg.widthOfTextAtSize(priceStr,9);
  page.drawText(priceStr, { x:c4 + COLS.price - 8 - priceW, y:y-14, size:9, font:fonts.reg, color:TEXT_DARK });

  page.drawLine({ start:{x:MARGIN,y:y-rowH}, end:{x:PAGE_W-MARGIN,y:y-rowH}, thickness:1, color:RULE });
  return y - rowH;
}

function drawTotalCardRight(page:any, fonts:Fonts, y:number, total:number): number {
  const cardW = 180;
  const cardH = 52;
  const x = PAGE_W - MARGIN - cardW;
  const title = "Total TTC";
  const tfs = 10;
  const vfs = 14;
  const val = euro(total);

  page.drawRectangle({ x, y: y-cardH, width: cardW, height: cardH, color: rgb(1,1,1), borderColor:RULE, borderWidth:1, });
  page.drawRectangle({ x, y: y-22, width: cardW, height: 22, color: BRAND_LIGHT });
  const tw = fonts.bold.widthOfTextAtSize(title, tfs);
  page.drawText(title, { x:x + (cardW - tw)/2, y: y-16, size: tfs, font: fonts.bold, color: TEXT_DARK });

  const vw = fonts.bold.widthOfTextAtSize(val, vfs);
  page.drawText(val, { x: x + (cardW - vw)/2, y: y - 22 - 18, size: vfs, font: fonts.bold, color: TEXT_DARK });

  return y - cardH - 12;
}

async function drawSignatureLeft(
  pdf: PDFDocument,
  page: any,
  fonts: Fonts,
  topY: number,
  signatureDataUrl?: string | null,
  preferredH: number = 92
): Promise<number> {
  const boxW = 240;
  const boxH = preferredH;
  const boxX = MARGIN;
  const boxY = topY - boxH;

  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(1,1,1), borderColor:RULE, borderWidth:1 });
  page.drawRectangle({ x: boxX, y: boxY + boxH - 22, width: boxW, height: 22, color: BRAND_LIGHT });
  page.drawText("Signature du client", { x: boxX + 10, y: boxY + boxH - 16, size: 10, font: fonts.bold, color: TEXT_DARK });

  const pad = 10;
  const innerW = boxW - pad * 2;
  const innerH = boxH - pad * 2;

  if (signatureDataUrl) {
    try {
      const b64 = signatureDataUrl.includes(",") ? signatureDataUrl.split(",")[1] : signatureDataUrl;
      const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
      let img: any;
      try { img = await pdf.embedPng(bytes); } catch { img = await pdf.embedJpg(bytes); }

      const scale = Math.min(innerW / img.width, innerH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const imgX = boxX + pad + (innerW - w) / 2;
      const imgY = boxY + pad + (innerH - h) / 2;

      page.drawImage(img, { x: imgX, y: imgY, width: w, height: h });
    } catch {
      const midY = boxY + pad + innerH / 2;
      page.drawLine({ start: { x: boxX + 12, y: midY }, end: { x: boxX + boxW - 12, y: midY }, thickness: 1, color: TEXT_DARK });
    }
  } else {
    const midY = boxY + pad + innerH / 2;
    page.drawLine({ start: { x: boxX + 12, y: midY }, end: { x: boxX + boxW - 12, y: midY }, thickness: 1, color: TEXT_DARK });

    const hint = "Signer ici";
    const hintW = fonts.reg.widthOfTextAtSize(hint, 8);
    page.drawText(hint, { x: boxX + (boxW - hintW) / 2, y: midY + 4, size: 8, font: fonts.reg, color: TEXT_MUTE });
  }

  return boxY - 10;
}

/* ────────────────────────────────────────────────────────────────────────────
   Builders
   ────────────────────────────────────────────────────────────────────────── */
export async function buildQuotePdfBuffer(data: QuotePayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { reg, bold };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = await drawHeader(pdf, page, fonts, data.company, "DEVIS", data.quoteNumber, data.dateISO);

  ({ page, y } = await drawClientCards(pdf, fonts, { page, y }, data));

  page.drawText("Détails de la réparation", { x: MARGIN, y, size: 12, font: bold, color: TEXT_DARK });
  y -= 18;
  y = drawRepairsHeader(page, fonts, y);

  let total = 0, rowIdx = 0;
  for (const dev of data.devices) {
    const devLabel = `${dev.category ?? "—"} • ${dev.model ?? "—"}`;
    for (const it of dev.items) {
      const qty = it.qty ?? 1;
      const colorText = typeof it.meta?.color !== "undefined" ? (it.meta?.color ?? "Je ne sais pas") : "—";
      const title = `${devLabel} — ${it.label}`;
      y = drawRepairsRow(page, fonts, y, rowIdx++, title, colorText, qty, it.price * qty);
      total += it.price * qty;
    }
  }
  if (data.travelFee && data.travelFee > 0) {
    y = drawRepairsRow(page, fonts, y, rowIdx++, "Frais de déplacement (estim.)", "—", 1, data.travelFee);
    total += data.travelFee;
  }

  y = drawTotalCardRight(page, fonts, y, total);

  if (data.aDomicile) {
    const text =
      "Intervention à domicile : des facteurs externes (trafic, météo, accès, stationnement, etc.) peuvent occasionner un retard. Le client sera prévenu dès que possible en cas de décalage.";
    const lines = wrapByWidth(text, reg, 9, PAGE_W - MARGIN * 2);
    for (const ln of lines) {
      page.drawText(ln, { x: MARGIN, y, size: 9, font: reg, color: TEXT_MUTE });
      y -= 12;
    }
  }

  return await pdf.save();
}

export async function buildContractPdfBuffer(data: ContractPayload): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { reg, bold };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = await drawHeader(pdf, page, fonts, data.company, "CONTRAT", data.contractNumber, data.dateISO);

  ({ page, y } = await drawClientCards(pdf, fonts, { page, y }, data));

  page.drawText("Détails de la réparation", { x: MARGIN, y, size: 12, font: bold, color: TEXT_DARK });
  y -= 18;
  y = drawRepairsHeader(page, fonts, y);

  let total = 0, rowIdx = 0;
  for (const dev of data.devices) {
    const devLabel = `${dev.category ?? "—"} • ${dev.model ?? "—"}`;
    for (const it of dev.items) {
      const qty = it.qty ?? 1;
      const colorText = typeof it.meta?.color !== "undefined" ? (it.meta?.color ?? "Je ne sais pas") : "—";
      const title = `${devLabel} — ${it.label}`;
      y = drawRepairsRow(page, fonts, y, rowIdx++, title, colorText, qty, it.price * qty);
      total += it.price * qty;
    }
  }
  if (data.travelFee && data.travelFee > 0) {
    y = drawRepairsRow(page, fonts, y, rowIdx++, "Frais de déplacement (estim.)", "—", 1, data.travelFee);
    total += data.travelFee;
  }

  // Signature + Total + Conditions — 1 page, signature plus basse
  const BOTTOM_SAFE = 56;
  const TOTAL_H = 72;
  const GAP = 10;
  const desiredOffset = 60; // ↓ plus d’air sous le tableau
  let blockTop = y - desiredOffset;

  const available = blockTop - BOTTOM_SAFE;
  let sigBoxH = Math.min(92, Math.max(70, available - TOTAL_H - GAP - 26));
  if (available < sigBoxH + TOTAL_H + GAP + 26) {
    blockTop = BOTTOM_SAFE + sigBoxH + TOTAL_H + GAP + 26;
  }

  const sigEndY = await drawSignatureLeft(pdf, page, fonts, blockTop, data.signatureDataUrl, sigBoxH);
  drawTotalCardRight(page, fonts, blockTop, total);

  y = Math.min(sigEndY, blockTop - TOTAL_H) - GAP;

  // Conditions de paiement (compact)
  page.drawText("Conditions de paiement", { x: MARGIN, y, size: 11, font: bold, color: TEXT_DARK });
  y -= 14;

  const due30 = data.deliveryDateISO ? ` (au plus tard le ${formatDate(addDaysISO(data.deliveryDateISO, 30))})` : "";
  const conds = [
    "• Acompte : 50% au dépôt de l’appareil.",
    `• Solde : 50% à payer dans les 30 jours suivant la remise de l’appareil${due30}.`,
  ];
  const fs = 8.5, lh = 10;
  for (const li of conds) {
    const lns = wrapByWidth(li, reg, fs, PAGE_W - MARGIN * 2);
    for (const ln of lns) {
      if (y - lh < BOTTOM_SAFE) break;
      page.drawText(ln, { x: MARGIN, y, size: fs, font: reg, color: TEXT_MUTE });
      y -= lh;
    }
  }

  return await pdf.save();
}

/* ────────────────────────────────────────────────────────────────────────────
   Facade
   ────────────────────────────────────────────────────────────────────────── */
export async function buildPdfBuffer(docType: DocType, payload: QuotePayload | ContractPayload): Promise<Uint8Array> {
  return docType === "quote"
    ? buildQuotePdfBuffer(payload as QuotePayload)
    : buildContractPdfBuffer(payload as ContractPayload);
}
