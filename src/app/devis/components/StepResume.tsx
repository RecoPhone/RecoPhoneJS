"use client";

import { useRouter } from "next/navigation";
import React, {
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

import type { QuoteDevice } from "./QuoteCard";
import type {
  QuotePayload,
  ContractPayload,
  CompanyInfo,
  Appointment,
} from "@/lib/pdfFile";

/* — Types props — */
export type StepResumeProps = {
  devices: QuoteDevice[];
  payInTwo: boolean;
  signatureDataUrl?: string | null;
  aDomicile: boolean;
  address?: { street: string; number: string; postalCode: string; city: string } | null;
  /** RDV choisi via StepSchedule (prioritaire) */
  appointment?: Appointment | null;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes?: string;
    travelFee?: number | undefined;
    /** Ancien fallback (unique ISO) éventuellement conservé */
    appointmentISO?: string | null;
  };
};

export type StepResumeHandle = { finalize: () => Promise<void> };

/* — Types utilitaires locaux — */
type QuoteItemMeta = { color?: string | null; partKind?: "back" | "frame" };
type QuoteItemLite = { label: string; price: number; qty?: number; meta?: QuoteItemMeta };
type QuoteDeviceLite = { category?: string; model?: string; items: QuoteItemLite[] };
type ClientInfoLite = { firstName: string; lastName: string; email: string; phone: string };

/* — Helpers — */
const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);

const COMPANY: CompanyInfo = {
  name: "RecoPhone",
  slogan: "Réparations éco-responsables, au prix juste",
  email: "hello@recophone.be",
  phone: "+32/492.09.05.33",
  website: "recophone.be",
  address: "Rte de Saussin 38/23a, 5190 Jemeppe-sur-Sambre",
  vat: "BE06 95 86 62 21",
};

function genQuoteNumberRP() {
  const n = Math.floor(Math.random() * 100000);
  return `RP_${String(n).padStart(5, "0")}`;
}
function genContractId() {
  const n = Math.floor(Math.random() * 100000);
  return `RC_${String(n).padStart(5, "0")}`;
}

/* — Component — */
const StepResume = forwardRef<StepResumeHandle, StepResumeProps>(function StepResume(
  { devices, payInTwo, signatureDataUrl, aDomicile, address, appointment, client },
  ref
) {
  const repairsTotal = useMemo(
    () => devices.reduce((sum, d) => sum + d.items.reduce((acc, it) => acc + it.price * (it.qty ?? 1), 0), 0),
    [devices]
  );
  const itemsCount = useMemo(
    () => devices.reduce((n, d) => n + d.items.reduce((m, it) => m + (it.qty ?? 1), 0), 0),
    [devices]
  );
  const hasRepairs = itemsCount > 0;

  const travelFee = aDomicile ? client.travelFee ?? 0 : 0;
  const grandTotal = repairsTotal + travelFee;

  const [quoteNumber] = useState(() => genQuoteNumberRP());
  const [contractNumber] = useState(() => genContractId());

  const [busy, setBusy] = useState<"none" | "finish">("none");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  // — Confirmation modal —
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmResolver = useRef<(val: boolean) => void>();
  const askConfirm = () => new Promise<boolean>((resolve) => { confirmResolver.current = resolve; setConfirmOpen(true); });
  const resolveConfirm = (val: boolean) => { setConfirmOpen(false); confirmResolver.current?.(val); confirmResolver.current = undefined; };

  /** Normalisation robuste du RDV (StepSchedule prioritaire, sinon fallback ISO) */
  const normalizedAppointment: Appointment | null = useMemo(() => {
    if (appointment && (appointment.dateISO || appointment.slot)) {
      const dateISO = appointment.dateISO ?? undefined;
      const slot =
        appointment.slot ??
        (appointment.dateISO
          ? new Date(appointment.dateISO).toLocaleTimeString("fr-BE", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Europe/Brussels",
            })
          : undefined);
      const ap: Appointment = {};
      if (dateISO) ap.dateISO = dateISO;
      if (slot) ap.slot = slot;
      return Object.keys(ap).length ? ap : null;
    }
    const iso = client?.appointmentISO ?? null;
    if (!iso) return null;
    return {
      dateISO: iso,
      slot: new Date(iso).toLocaleTimeString("fr-BE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Brussels",
      }),
    };
  }, [appointment, client]);

  // duplicatas tolérants
  const appointmentDate = normalizedAppointment?.dateISO;
  const appointmentSlot = normalizedAppointment?.slot;
  const appointmentISO  = normalizedAppointment?.dateISO;

  const buildDevicesLite = (): QuoteDeviceLite[] =>
    devices.map((d) => ({
      category: d.category,
      model: d.model,
      items: d.items.map((it) => ({
        label: it.label,
        price: it.price,
        qty: it.qty,
        meta: it.meta
          ? { color: typeof it.meta.color === "undefined" ? null : it.meta.color, partKind: it.meta.partKind }
          : undefined,
      })),
    }));

  const buildClientLite = (): ClientInfoLite => ({
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
  });

  const quotePayload: QuotePayload = {
    quoteNumber,
    dateISO: new Date().toISOString(),
    company: COMPANY,
    client: buildClientLite(),
    devices: buildDevicesLite(),
    travelFee,
    payInTwo,
    signatureDataUrl: signatureDataUrl ?? null,
    aDomicile,
    address: address ?? null,
    appointment: normalizedAppointment,
    appointmentDate,
    appointmentSlot,
    appointmentISO,
  };

  const contractPayload: ContractPayload = {
    contractNumber,
    dateISO: new Date().toISOString(),
    company: COMPANY,
    client: buildClientLite(),
    devices: buildDevicesLite(),
    travelFee,
    signatureDataUrl: signatureDataUrl ?? null,
    aDomicile,
    address: address ?? null,
    appointment: normalizedAppointment,
    appointmentDate,
    appointmentSlot,
    appointmentISO,
  };

  /** Expose finalize() au parent */
  useImperativeHandle(ref, () => ({
    finalize: async () => {
      if (!hasRepairs) {
        const msg = "Aucune réparation sélectionnée. Ajoutez au moins un élément avant de finaliser.";
        setErrorMsg(msg);
        throw new Error(msg);
      }
      const ok = await askConfirm();
      if (!ok) return;

      try {
        setErrorMsg(null);
        setBusy("finish");
        await fetch("/api/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quote: quotePayload,
            contract: payInTwo ? contractPayload : null,
            payInTwo,
          }),
        }).then(async (res) => {
          if (!res.ok) throw new Error((await res.json())?.error || "finish error");
        });

        // Nettoyage de brouillons locaux connus
        try {
          const candidates = ["recophone:quote", "quote:draft", "rp:quote", "rp-quote", "RECOPHONE_QUOTE"];
          for (const k of candidates) {
            localStorage.removeItem(k);
            sessionStorage.removeItem(k);
          }
        } catch {}

        // Redirection -> page s'occupe du reset + alerte succès
        router.replace("/devis?success=1");
        try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
      } catch (e: any) {
        const msg = e?.message || "Une erreur est survenue lors de la finalisation.";
        setErrorMsg(msg);
        throw new Error(msg);
      } finally {
        setBusy("none");
      }
    },
  }));

  /* ===================== UI ===================== */
  return (
    <section aria-labelledby="step-resume-title" className="w-full">
      <header className="mb-3">
        <h2 id="step-resume-title" className="text-xl font-semibold text-[#222]">
          {aDomicile ? "5) Résumé & confirmation" : "4) Résumé & confirmation"}
        </h2>
        <p className="text-sm text-gray-600">Vérifiez les informations avant de valider votre demande de devis.</p>
      </header>

      <div className="space-y-4">
        {/* Appareils + réparations */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b text-sm font-medium text-[#222]">Appareils & réparations</div>
          {devices.map((d, idx) => {
            const deviceTotal = d.items.reduce((acc, it) => acc + it.price * (it.qty ?? 1), 0);
            return (
              <div key={d.id ?? idx} className="px-4 py-3 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-[#222]">Appareil {idx + 1}</div>
                  <div className="text-xs text-gray-600">{d.model ?? "—"}</div>
                </div>
                <div className="text-xs text-gray-600">{d.category ?? "—"}</div>

                <div className="mt-2">
                  {d.items.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">Aucune réparation sélectionnée.</div>
                  ) : (
                    <ul className="divide-y">
                      {d.items.map((it, i) => (
                        <li key={it.key ?? i} className="py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[#222]">{it.label}</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(it.price * (it.qty ?? 1))}
                            </span>
                          </div>
                          {typeof it?.meta?.color !== "undefined" && (
                            <div className="mt-1 text-[11px] text-gray-600 flex items-center gap-2">
                              <span className="rounded-full bg-gray-100 px-2 py-0.5">
                                Couleur : <strong>{it.meta?.color ?? "Je ne sais pas"}</strong>
                              </span>
                              {it.meta?.partKind && (
                                <span className="text-gray-500">
                                  ({it.meta.partKind === "back" ? "Face arrière" : "Châssis"})
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-2 text-sm flex items-center justify-between">
                  <span className="text-gray-700">Sous-total appareil</span>
                  <span className="font-semibold">{formatPrice(deviceTotal)}</span>
                </div>
              </div>
            );
          })}

          <div className="px-4 py-3 bg-gray-50 text-sm flex items-center justify-between rounded-b-2xl">
            <span className="text-gray-700">Total estimé</span>
            <span className="font-semibold">{formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* Coordonnées client */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b text-sm font-medium text-[#222]">Vos coordonnées</div>
          <div className="px-4 py-3 text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600">Nom :</span>{" "}
              <strong>{client.firstName} {client.lastName}</strong>
            </div>
            <div>
              <span className="text-gray-600">Téléphone :</span> <strong>{client.phone}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-600">Email :</span> <strong>{client.email}</strong>
            </div>
            {client.notes && (
              <div className="sm:col-span-2">
                <span className="text-gray-600">Précisions :</span>{" "}
                <span className="italic">{client.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* À domicile */}
        {aDomicile ? (
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b text-sm font-medium text-[#222]">Intervention à domicile</div>
            <div className="px-4 py-3 text-sm space-y-2">
              {address && (
                <div>
                  <div className="text-gray-600">Adresse :</div>
                  <div className="font-medium">
                    {address.street} {address.number}, {address.postalCode} {address.city}
                  </div>
                </div>
              )}
              {normalizedAppointment?.dateISO || normalizedAppointment?.slot ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {normalizedAppointment?.dateISO && (
                    <div>
                      <span className="text-gray-600">Date souhaitée :</span>{" "}
                      <span className="font-medium">
                        {new Date(normalizedAppointment.dateISO).toLocaleDateString("fr-BE")}
                      </span>
                    </div>
                  )}
                  {normalizedAppointment?.slot && (
                    <div>
                      <span className="text-gray-600">Créneau :</span>{" "}
                      <span className="font-medium">{normalizedAppointment.slot}</span>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Frais de déplacement</span>
                <span className="font-medium">{formatPrice(travelFee)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Paiement */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b text-sm font-medium text-[#222]">Paiement</div>
          <div className="px-4 py-3 text-sm">
            {payInTwo ? (
              <div>Le <strong>contrat</strong> sera généré et envoyé avec le devis lors du clic sur <strong>Terminer</strong>.</div>
            ) : (
              <div>Règlement standard (au retrait / après intervention).</div>
            )}
          </div>
        </div>

        {/* (Section "Documents" supprimée comme demandé) */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
      </div>

      {/* — Modal de confirmation — */}
      {confirmOpen && (
        <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => resolveConfirm(false)} />
          <div className="relative z-10 w-[92vw] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b">
              <h3 className="text-base font-semibold text-[#222]">Confirmer la finalisation</h3>
              <p className="text-xs text-gray-600 mt-1">
                Vérifie rapidement les informations ci-dessous. Tu pourras toujours nous répondre si un détail change.
              </p>
            </div>

            <div className="px-5 py-4 text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total estimé</span>
                <span className="font-semibold">{formatPrice(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Paiement</span>
                <span className="font-medium">{payInTwo ? "En 2 fois (contrat envoyé)" : "Standard"}</span>
              </div>
              {aDomicile && (
                <>
                  {address && (
                    <div>
                      <div className="text-gray-600">Adresse d’intervention</div>
                      <div className="font-medium">
                        {address.street} {address.number}, {address.postalCode} {address.city}
                      </div>
                    </div>
                  )}
                  {normalizedAppointment?.dateISO || normalizedAppointment?.slot ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {normalizedAppointment?.dateISO && (
                        <div>
                          <div className="text-gray-600">Date souhaitée</div>
                          <div className="font-medium">
                            {new Date(normalizedAppointment.dateISO).toLocaleDateString("fr-BE")}
                          </div>
                        </div>
                      )}
                      {normalizedAppointment?.slot && (
                        <div>
                          <div className="text-gray-600">Créneau</div>
                          <div className="font-medium">{normalizedAppointment.slot}</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Frais de déplacement</span>
                    <span className="font-medium">{formatPrice(travelFee)}</span>
                  </div>
                </>
              )}
              {typeof signatureDataUrl === "string" && (
                <div className="text-[11px] text-gray-600">
                  Signature : <span className="font-medium">{signatureDataUrl ? "fournie" : "non fournie"}</span>
                </div>
              )}
              <div className="text-[11px] text-gray-500">
                En confirmant, tu envoies ta demande. {payInTwo ? "Un contrat vous sera transmis avec le devis." : ""}
              </div>
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => resolveConfirm(true)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "#54b435" }}
              >
                Confirmer et terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* — Overlay de loading pendant l’envoi — */}
      {busy === "finish" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-xl border border-gray-200 flex items-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#54b435]" aria-hidden />
            <span className="text-sm text-[#222] font-medium">Envoi des documents…</span>
          </div>
        </div>
      )}
    </section>
  );
});

export default StepResume;
