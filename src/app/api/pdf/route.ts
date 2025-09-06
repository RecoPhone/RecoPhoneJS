// src/app/api/pdf/route.ts
import { NextResponse } from "next/server";
import {
  buildPdfBuffer,
  type DocType,
  type QuotePayload,
  type ContractPayload,
} from "@/lib/pdfFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stringify sûr pour les logs
function safeStringify(obj: unknown, space = 2) {
  try {
    return JSON.stringify(obj, null, space);
  } catch {
    try {
      return JSON.stringify(
        obj,
        (k, v) => (typeof v === "bigint" ? v.toString() : v),
        space
      );
    } catch {
      return "[unserializable]";
    }
  }
}

export async function POST(req: Request) {
  let bodyText = "";
  let body:
    | {
        docType?: DocType;
        payload?: QuotePayload | ContractPayload;
        download?: boolean;
      }
    | null = null;

  try {
    // 1) Lire le body brut pour log
    bodyText = await req.text();
    console.debug("[/api/pdf] raw body (first 2KB)", bodyText.slice(0, 2048));

    // 2) Parser le JSON
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error("[/api/pdf] JSON parse error:", e);
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 3) Logs utiles (RDV)
    console.debug(
      "[/api/pdf] received",
      safeStringify({
        docType: body?.docType,
        aDomicile:
          body?.payload && "aDomicile" in body.payload
            ? (body.payload as any).aDomicile
            : undefined,
        address:
          body?.payload && "address" in body.payload
            ? (body.payload as any).address
            : undefined,
        appointment:
          body?.payload && "appointment" in body.payload
            ? (body.payload as any).appointment
            : undefined,
        appointmentDate:
          body?.payload && "appointmentDate" in body.payload
            ? (body.payload as any).appointmentDate
            : undefined,
        appointmentSlot:
          body?.payload && "appointmentSlot" in body.payload
            ? (body.payload as any).appointmentSlot
            : undefined,
        appointmentISO:
          body?.payload && "appointmentISO" in body.payload
            ? (body.payload as any).appointmentISO
            : undefined,
        download: body?.download,
      })
    );

    // 4) Validation
    if (!body?.docType || (body.docType !== "quote" && body.docType !== "contract")) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'docType' (expected 'quote' | 'contract')" },
        { status: 400 }
      );
    }
    if (!body.payload) {
      return NextResponse.json(
        { ok: false, error: "Missing 'payload'" },
        { status: 400 }
      );
    }

    // 5) Génération du PDF
    console.debug("[/api/pdf] building buffer for", body.docType);
    const bytes = await buildPdfBuffer(body.docType, body.payload);
    const pdfBytes =
      bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as ArrayBuffer);
    console.debug("[/api/pdf] built buffer bytes:", pdfBytes.byteLength);

    // 6) Nom de fichier
    let filename = "document.pdf";
    if (body.docType === "quote") {
      const q = body.payload as QuotePayload;
      filename = `devis_${q?.quoteNumber ?? "RP_xxxxx"}.pdf`;
    } else {
      const c = body.payload as ContractPayload;
      filename = `contrat_${c?.contractNumber ?? "RC_xxxxx"}.pdf`;
    }

    // 7) Headers
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdfBytes.byteLength),
      "Cache-Control": "no-store",
    };
    headers["Content-Disposition"] = body.download
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    // ✅ Retourner un ReadableStream (évite les soucis de types Blob/Uint8Array)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(pdfBytes);
        controller.close();
      },
    });

    console.debug("[/api/pdf] streaming response…");
    return new NextResponse(stream, { status: 200, headers });
  } catch (e: any) {
    console.error("[/api/pdf] ERROR", e?.message ?? e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected error while generating PDF" },
      { status: 500 }
    );
  }
}
