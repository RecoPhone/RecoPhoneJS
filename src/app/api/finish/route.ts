// src/app/api/finish/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildPdfBuffer } from "@/lib/pdfFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toUint8Array(data: any): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) return new Uint8Array(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data as ArrayBuffer);
}

// NOM_NUMERODEDEVIS en ASCII, MAJ, underscores
function slugifyName(s: string) {
  return (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

async function uploadToStorage(
  bytes: Uint8Array,
  fileName: string,
  folderName: string
): Promise<string> {
  const endpoint = process.env.DOWNLOAD_ENDPOINT;
  const token = process.env.DOWNLOAD_BEARER;
  if (!endpoint || !token) {
    const missing = [
      !endpoint && "DOWNLOAD_ENDPOINT",
      !token && "DOWNLOAD_BEARER",
    ].filter(Boolean).join(", ");
    throw new Error(`Server misconfigured: missing ${missing}`);
  }

  const form = new FormData();
  form.set("file", new Blob([Buffer.from(bytes)], { type: "application/pdf" }), fileName);
  form.set("folder", folderName);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  let j: any = {};
  try { j = await res.json(); } catch {}
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${j?.error || "unknown"}`);

  const url = j?.url || j?.download_url;
  if (!url) throw new Error("Upload response missing url");
  return String(url);
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || "false") === "true", // 465 => true, 587 => false (STARTTLS)
    auth: { user: SMTP_USER!, pass: SMTP_PASS! },
    tls: { servername: SMTP_HOST },
  });

  await transporter.verify();

  const from = `${SMTP_USER}`;

  const info = await transporter.sendMail({
    from,                           // Header From = SMTP_USER
    to: opts.to,                    // Client
    subject: opts.subject,
    text: opts.text,                // Fallback texte
    html: opts.html,                // Version HTML avec liens ancrés
    envelope: { from, to: [opts.to] }, // Enveloppe alignée (DMARC ok)
    replyTo: from,
  });

  if (Array.isArray(info.rejected) && info.rejected.length > 0) {
    throw new Error("SMTP rejected: " + info.rejected.join(", "));
  }

  // Copie séparée pour toi (au lieu d'un BCC)
  await transporter.sendMail({
    from,
    to: "benjamin.collin@recophone.be",
    subject: `[COPIE] ${opts.subject}`,
    text: opts.text,
    html: opts.html,
    envelope: { from, to: ["benjamin.collin@recophone.be"] },
    replyTo: from,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { quote, contract, payInTwo } = (await req.json()) as {
      quote: any;
      contract?: any;
      payInTwo?: boolean;
    };
    if (!quote?.client?.email || !quote?.client?.lastName || !quote?.quoteNumber) {
      return NextResponse.json({ error: "Bad payload: missing client/quoteNumber" }, { status: 400 });
    }

    const folder = `${slugifyName(quote.client.lastName)}_${quote.quoteNumber}`;

    // 1) Générer + uploader le devis
    const quoteBytes = toUint8Array(await buildPdfBuffer("quote", quote));
    const quoteFile  = `devis_${quote.quoteNumber}.pdf`;
    const quoteUrl   = await uploadToStorage(quoteBytes, quoteFile, folder);

    // 2) Générer + uploader le contrat si besoin
    let contractUrl: string | null = null;
    if (payInTwo && contract) {
      const contractBytes = toUint8Array(await buildPdfBuffer("contract", contract));
      const contractFile  = `contrat_${contract.contractNumber || quote.quoteNumber}.pdf`;
      contractUrl         = await uploadToStorage(contractBytes, contractFile, folder);
    }

    // 3) Email HTML (liens ancrés) + fallback texte
    const subject = `Votre ${contractUrl ? "devis et contrat" : "devis"} RecoPhone ${quote.quoteNumber}`;
    const firstName = quote?.client?.firstName || "";

    const textLines = [
      `Bonjour ${firstName},`,
      ``,
      `Merci pour votre demande chez RecoPhone.`,
      `Devis : ${quoteUrl}`,
      ...(contractUrl ? [`Contrat : ${contractUrl}`] : []),
      ``,
      `Besoin d'aide ? Répondez simplement à cet e-mail.`,
      `— RecoPhone`,
    ];
    const text = textLines.join("\n");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5">
        <p>Bonjour ${firstName},</p>
        <p>Merci pour votre demande chez <strong>RecoPhone</strong>.</p>
        <p style="margin:14px 0">
          <a href="${quoteUrl}" target="_blank" rel="noopener"
             style="display:inline-block;background:#54b435;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">
            Télécharger le devis
          </a>
        </p>
        ${
          contractUrl
            ? `<p style="margin:6px 0">
                 <a href="${contractUrl}" target="_blank" rel="noopener"
                    style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">
                   Télécharger le contrat
                 </a>
               </p>`
            : ""
        }
        <p style="margin-top:18px">Besoin d'aide ? Répondez simplement à cet e-mail.</p>
        <p>— RecoPhone</p>
      </div>
    `;

    await sendMail({ to: String(quote.client.email).trim(), subject, text, html });

    return NextResponse.json({ ok: true, folder, quoteUrl, contractUrl }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/finish] error:", e);
    return NextResponse.json({ error: e?.message || "finish error" }, { status: 400 });
  }
}
