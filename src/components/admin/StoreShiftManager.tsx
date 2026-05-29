import { useState } from "react";
import { createPortal } from "react-dom";
import { formatCOP } from "../../lib/format";

function formatInputCOP(rawString: string): string {
  const clean = rawString.replace(/\D/g, "");
  if (!clean) return "";
  const num = parseInt(clean, 10);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

function parseInputCOP(formattedString: string): number {
  const clean = formattedString.replace(/\D/g, "");
  return parseInt(clean, 10) || 0;
}

interface StoreShiftManagerProps {
  isOpen: boolean;
  shift: any | null;
  totals: { base: number; income: number; expense: number };
  transactions: any[];
  sendingReport: boolean;
  loading: boolean;
  pin: string;
  toggleShop: () => Promise<void>;
  closeShiftFlow: () => Promise<void>;
  openShiftFlow: (baseAmount: number) => Promise<void>;
  recordExpense: (amount: number, description: string) => Promise<void>;
  sendReport: () => Promise<void>;
  loadBalance: (pin: string) => Promise<void>;
}

export default function StoreShiftManager({
  isOpen,
  shift,
  totals,
  transactions,
  sendingReport,
  loading,
  pin,
  toggleShop,
  closeShiftFlow,
  openShiftFlow,
  recordExpense,
  sendReport,
  loadBalance,
}: StoreShiftManagerProps) {
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [baseAmountInput, setBaseAmountInput] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [localError, setLocalError] = useState("");
  const [isBalanceCollapsed, setIsBalanceCollapsed] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [downloadCsv, setDownloadCsv] = useState(true);

  const handleCloseClick = () => {
    setShowCloseModal(true);
  };

  const generateAndDownloadCSV = () => {
    if (!shift) return;

    let csvRows = [];
    csvRows.push("Reporte de Caja - Callejeros / Stray-Wolfies");
    csvRows.push(`Turno ID:,${shift.id}`);
    csvRows.push(`Apertura:,${shift.opened_at ? new Date(shift.opened_at).toLocaleString("es-CO") : ""}`);
    csvRows.push(`Cierre:,${new Date().toLocaleString("es-CO")}`);
    csvRows.push("");

    csvRows.push("Resumen de Caja");
    csvRows.push(`Base inicial:,${totals.base}`);
    csvRows.push(`Ingresos:,${totals.income}`);
    csvRows.push(`Gastos:,${totals.expense}`);
    csvRows.push(`Balance final:,${totals.base + totals.income - totals.expense}`);
    csvRows.push("");

    csvRows.push("Detalle de Movimientos");
    csvRows.push("Fecha,Tipo,Monto,Descripcion");

    transactions.forEach((tx) => {
      const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleString("es-CO") : "";
      const typeStr = tx.type === "base" ? "Base" : tx.type === "income" ? "Ingreso" : "Gasto";
      const amountStr = tx.amount || 0;
      const descStr = (tx.description || "").replace(/"/g, '""');
      csvRows.push(`"${dateStr}","${typeStr}",${amountStr},"${descStr}"`);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    link.setAttribute("download", `Balance_caja_${dd}_${mm}_${yy}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmClose = async () => {
    if (downloadCsv) {
      try {
        generateAndDownloadCSV();
      } catch (err) {
        console.error("Error generating CSV:", err);
      }
    }
    setShowCloseModal(false);
    await closeShiftFlow();
  };

  const handleOpenShift = async () => {
    setLocalError("");
    const amount = parseInputCOP(baseAmountInput);
    if (amount < 0) {
      setLocalError("El monto base no puede ser negativo");
      return;
    }
    await openShiftFlow(amount);
    setBaseAmountInput("");
    setShowOpenForm(false);
  };

  const handleRecordExpense = async () => {
    setLocalError("");
    const amount = parseInputCOP(expenseAmount);
    if (amount <= 0) {
      setLocalError("Monto inválido");
      return;
    }
    const desc = expenseDesc.trim();
    if (!desc) {
      setLocalError("Descripción requerida");
      return;
    }
    await recordExpense(amount, desc);
    setExpenseAmount("");
    setExpenseDesc("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Local Error inside StoreShiftManager if any */}
      {localError && (
        <p className="rounded-xl border border-ember/40 bg-ember/10 px-3 py-2 text-center text-sm text-ember">
          {localError}
        </p>
      )}

      {/* ── Tienda / Turno ────────────────────────────────── */}
      <section className="card-ash flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-left">
            <p className="text-sm font-semibold">
              Tienda {isOpen ? "🟢 Abierta" : "🔴 Cerrada"}
            </p>
            <p className="text-xs text-smoke">
              {shift
                ? `Turno activo desde ${new Date(shift.opened_at).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Sin turno activo"}
            </p>
          </div>

          {/* Buttons depend on the state */}
          <div className="flex shrink-0 gap-2">
            {/* If store is open but NO shift: let them close the store directly */}
            {isOpen && !shift && (
              <button
                type="button"
                className="rounded-xl border border-ember/50 px-4 py-2 text-sm font-semibold text-ember transition hover:bg-ember/10 active:scale-[0.98]"
                disabled={loading}
                onClick={toggleShop}
              >
                {loading ? "Cerrando…" : "Cerrar tienda"}
              </button>
            )}

            {/* If shift is active: show close-shift (which also closes the store) */}
            {shift && (
              <button
                type="button"
                className="rounded-xl border border-ember/50 px-4 py-2 text-sm font-semibold text-ember transition hover:bg-ember/10 active:scale-[0.98]"
                disabled={loading}
                onClick={handleCloseClick}
              >
                {loading ? "Cerrando…" : "Cerrar turno"}
              </button>
            )}

            {/* If no shift: show open-shift trigger */}
            {!shift && (
              <button
                type="button"
                className="btn-fire px-4 py-2 text-sm"
                disabled={loading}
                onClick={() => setShowOpenForm(true)}
              >
                Abrir turno
              </button>
            )}
          </div>
        </div>

        {/* Inline form to open a new shift with base amount */}
        {showOpenForm && !shift && (
          <div className="flex flex-col gap-2 rounded-xl border border-flame/20 bg-void/40 p-3">
            <p className="text-xs font-semibold text-gold">Nuevo turno — Monto base en caja</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="$ 0"
              value={baseAmountInput}
              onChange={(e) => {
                const formatted = formatInputCOP(e.target.value);
                setBaseAmountInput(formatted);
              }}
              className="rounded-lg border border-white/15 bg-ash px-3 py-2 text-cream outline-none focus:border-flame"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-fire flex-1 py-2 text-sm"
                disabled={loading}
                onClick={handleOpenShift}
              >
                {loading ? "Abriendo…" : "Abrir tienda"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/15 px-3 py-2 text-xs text-smoke transition hover:text-cream"
                onClick={() => setShowOpenForm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Balance de Caja ─────────────────────────────── */}
      {shift && (
        <section className="card-ash flex flex-col gap-4 p-4 text-left text-sm">
          {/* Collapsible Header */}
          <button
            type="button"
            onClick={() => setIsBalanceCollapsed(!isBalanceCollapsed)}
            className="flex w-full items-center justify-between font-semibold text-cream focus:outline-none"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gold shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Balance de Caja
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-4 w-4 transform transition-transform duration-200 ${isBalanceCollapsed ? "" : "rotate-180"}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {!isBalanceCollapsed && (
            <>
              {/* Totals grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-void/40 p-3 text-center">
                  <p className="text-xs text-smoke">Base</p>
                  <p className="font-display text-lg text-cream">{formatCOP(totals.base)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-void/40 p-3 text-center">
                  <p className="text-xs text-smoke">Ingresos</p>
                  <p className="font-display text-lg text-gold">{formatCOP(totals.income)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-void/40 p-3 text-center">
                  <p className="text-xs text-smoke">Gastos</p>
                  <p className="font-display text-lg text-ember">{formatCOP(totals.expense)}</p>
                </div>
                <div className="rounded-xl border border-flame/30 bg-flame/5 p-3 text-center">
                  <p className="text-xs text-smoke">Balance</p>
                  <p className="font-display text-lg text-fire">
                    {formatCOP(totals.base + totals.income - totals.expense)}
                  </p>
                </div>
              </div>

              {/* Expense form */}
              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-void/40 p-3">
                <p className="text-xs font-semibold text-gold">Registrar gasto</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Monto"
                    value={expenseAmount}
                    onChange={(e) => {
                      const formatted = formatInputCOP(e.target.value);
                      setExpenseAmount(formatted);
                    }}
                    className="w-28 rounded-lg border border-white/15 bg-ash px-3 py-2 text-cream outline-none focus:border-flame"
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-ash px-3 py-2 text-cream outline-none focus:border-flame"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-flame/40 px-4 py-2 text-xs font-semibold text-flame transition hover:bg-flame/10 active:scale-[0.98]"
                  disabled={loading || !expenseAmount || !expenseDesc.trim()}
                  onClick={handleRecordExpense}
                >
                  {loading ? "Registrando…" : "Agregar gasto"}
                </button>
              </div>

              {/* Transactions list */}
              {transactions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-smoke">Movimientos del turno</p>
                  <div className="max-h-48 overflow-y-auto scrollbar-thin rounded-xl border border-white/10 bg-void/40">
                    {transactions.map((tx: any, i: number) => (
                      <div
                        key={tx.id || i}
                        className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${
                          i > 0 ? "border-t border-white/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {tx.type === "income" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gold shrink-0">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1.25-11.25a.75.75 0 00-1.06 0L7.47 9.47a.75.75 0 001.06 1.06l1.47-1.47v4.44a.75.75 0 001.5 0V9.06l1.47 1.47a.75.75 0 101.06-1.06l-2.75-2.75z" clipRule="evenodd" />
                            </svg>
                          ) : tx.type === "expense" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ember shrink-0">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.44L7.78 9.72a.75.75 0 00-1.06 1.06l2.75 2.75a.75.75 0 001.06 0l2.75-2.75a.75.75 0 00-1.06-1.06l-1.47 1.47V6.75z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-smoke shrink-0">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 10a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 017 10z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-cream">{tx.description || tx.type}</span>
                        </div>
                        <span
                          className={`shrink-0 font-semibold ${
                            tx.type === "income"
                              ? "text-gold"
                              : tx.type === "expense"
                                ? "text-ember"
                                : "text-cream"
                          }`}
                        >
                          {tx.type === "expense" ? "−" : "+"}{formatCOP(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions: send report */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="grow rounded-xl border border-white/15 py-2 text-xs text-cream transition hover:border-flame/40"
                  disabled={sendingReport}
                  onClick={sendReport}
                >
                  Enviar reporte por email
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs text-smoke transition hover:text-cream flex items-center justify-center"
                  disabled={loading}
                  onClick={() => loadBalance(pin)}
                  aria-label="Actualizar balance"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Modal de Confirmación de Cierre de Caja ── */}
      {showCloseModal && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void/85 p-4 backdrop-blur-md">
              <div className="card-ash w-full max-w-sm flex flex-col gap-4 p-6 shadow-2xl border border-flame/30">
                <h3 className="font-display text-lg text-fire text-center">Confirmar Cierre de Caja</h3>
                <p className="text-sm text-smoke text-center leading-relaxed">
                  ¿Estás seguro de que deseas cerrar el turno activo y cambiar el estado de la tienda a cerrada?
                </p>

                <label className="flex items-center justify-center gap-2 cursor-pointer py-2 text-sm text-cream hover:text-gold transition">
                  <input
                    type="checkbox"
                    checked={downloadCsv}
                    onChange={(e) => setDownloadCsv(e.target.checked)}
                    className="accent-flame w-4 h-4 cursor-pointer"
                  />
                  Descargar reporte balance en CSV
                </label>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn-fire flex-1 py-2.5 text-sm"
                    onClick={handleConfirmClose}
                    disabled={loading}
                  >
                    {loading ? "Cerrando…" : "Confirmar y Cerrar"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-smoke hover:text-cream transition flex-1"
                    onClick={() => setShowCloseModal(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
