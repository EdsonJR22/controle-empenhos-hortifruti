"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/client-api";
import {
  formatCurrency,
  formatQuantity,
  todayIso,
} from "../lib/format";
import type {
  ApiErrorBody,
  CommitmentDetail,
  CreateInvoicePayload,
  OrderDetail,
} from "../lib/types";
import { Icon } from "./icon";
import { Modal } from "./modal";

export function InvoiceModal({
  open,
  commitment,
  orderId,
  onClose,
  onSaved,
}: {
  open: boolean;
  commitment: CommitmentDetail;
  orderId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [informedTotal, setInformedTotal] = useState("");
  const [currentEffectiveTotalCents, setCurrentEffectiveTotalCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setOrder(null);
    setNumber("");
    setInvoiceDate(todayIso());
    setNotes("");
    setSearch("");
    setQuantities({});
    setPrices({});
    setInformedTotal("");
    setCurrentEffectiveTotalCents(0);
    setLoading(false);
    setError("");
  };

  useEffect(() => {
    if (!open || !orderId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      resetForm();
      setLoading(true);
      void apiFetch(`/api/orders/${orderId}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = (await response.json()) as
            | { order: OrderDetail }
            | ApiErrorBody;
          if (!response.ok || !("order" in body)) {
            throw new Error(
              "error" in body ? body.error : "Não foi possível abrir o pedido.",
            );
          }
          const detail = body.order;
          const invoiceItems = detail.invoice?.items ?? detail.items;
          setOrder(detail);
          setNumber(detail.invoice?.number ?? "");
          setInvoiceDate(detail.invoice?.invoiceDate ?? todayIso());
          setNotes(detail.invoice?.notes ?? "");
          setQuantities(
            Object.fromEntries(
              invoiceItems.map((item) => [item.commitmentItemId, String(item.quantity)]),
            ),
          );
          setPrices(
            Object.fromEntries(
              invoiceItems.map((item) => [
                item.commitmentItemId,
                (item.unitPriceCents / 100).toFixed(2),
              ]),
            ),
          );
          setInformedTotal(
            detail.invoice &&
              detail.invoice.totalCents !== detail.invoice.calculatedTotalCents
              ? (detail.invoice.totalCents / 100).toFixed(2)
              : "",
          );
          setCurrentEffectiveTotalCents(
            detail.invoice?.totalCents ?? detail.requestedTotalCents,
          );
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Não foi possível abrir o pedido.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, orderId]);

  const requestedQuantities = useMemo(
    () =>
      Object.fromEntries(
        (order?.items ?? []).map((item) => [item.commitmentItemId, item.quantity]),
      ),
    [order],
  );
  const selectedItems = useMemo(
    () =>
      (order?.items ?? []).flatMap((item) => {
        const quantity = Number(quantities[item.commitmentItemId]);
        if (!Number.isFinite(quantity) || quantity <= 0) return [];
        const priceValue = prices[item.commitmentItemId];
        const unitPriceCents = priceValue
          ? Math.round(Number(priceValue) * 100)
          : item.unitPriceCents;
        return [{ item, quantity, unitPriceCents }];
      }),
    [order, prices, quantities],
  );
  const calculatedTotalCents = selectedItems.reduce(
    (sum, row) => sum + Math.round(row.quantity * row.unitPriceCents),
    0,
  );
  const informedTotalCents = informedTotal
    ? Math.round(Number(informedTotal) * 100)
    : null;
  const effectiveTotalCents =
    informedTotalCents && informedTotalCents > 0
      ? informedTotalCents
      : calculatedTotalCents;
  const availableCents = commitment.balanceCents + currentEffectiveTotalCents;
  const remainingAfterCents = availableCents - effectiveTotalCents;
  const exceedsLimit = remainingAfterCents < 0;
  const filteredItems = (order?.items ?? []).filter((item) =>
    item.description
      .toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderId || exceedsLimit || loading) return;
    setError("");
    const payload: CreateInvoicePayload = {
      number,
      invoiceDate,
      notes,
      informedTotalCents,
      items: selectedItems.map((row) => ({
        commitmentItemId: row.item.commitmentItemId,
        quantity: row.quantity,
        unitPriceCents: row.unitPriceCents,
      })),
    };
    setSaving(true);
    try {
      const response = await apiFetch(`/api/orders/${orderId}/invoice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        | { invoice: { id: string } }
        | ApiErrorBody;
      if (!response.ok || !("invoice" in body)) {
        throw new Error(
          "error" in body ? body.error : "Não foi possível salvar a nota fiscal.",
        );
      }
      resetForm();
      onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível salvar a nota fiscal.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${order?.invoice ? "Editar nota fiscal" : "Transformar pedido em NF"} · NE ${commitment.number}`}
      subtitle={order ? `Pedido original: ${order.reference}` : "Carregando pedido…"}
      size="wide"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body stack-lg">
          {loading ? (
            <div className="modal-loading">Carregando dados do pedido…</div>
          ) : order ? (
            <>
              <div className="invoice-explainer">
                <Icon name="receipt" />
                <div>
                  <strong>Registre somente o que foi entregue</strong>
                  <p>O pedido original ficará preservado. A NF substituirá a reserva nos saldos e nas estatísticas.</p>
                </div>
              </div>

              <div className="form-grid form-grid-3">
                <label className="field">
                  <span>Número da NF</span>
                  <input
                    required
                    placeholder="Ex.: 9860"
                    value={number}
                    onChange={(event) => setNumber(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Data da NF</span>
                  <input
                    required
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Valor total da NF <small>opcional</small></span>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">R$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder={(calculatedTotalCents / 100).toFixed(2)}
                      value={informedTotal}
                      onChange={(event) => setInformedTotal(event.target.value)}
                    />
                  </div>
                  <small className="field-help">Use o total impresso na nota quando ele diferir do cálculo.</small>
                </label>
              </div>

              <div className="order-summary-strip">
                <div><span>Valor do pedido</span><strong>{formatCurrency(order.requestedTotalCents)}</strong></div>
                <div><span>Total calculado da NF</span><strong>{formatCurrency(calculatedTotalCents)}</strong></div>
                <div><span>Valor efetivo da NF</span><strong>{formatCurrency(effectiveTotalCents)}</strong></div>
                <div className={exceedsLimit ? "negative" : "positive"}>
                  <span>Saldo após a NF</span><strong>{formatCurrency(remainingAfterCents)}</strong>
                </div>
              </div>

              {exceedsLimit && (
                <div className="limit-alert">
                  <Icon name="alert" />
                  <div>
                    <strong>A nota fiscal ultrapassa o saldo da NE</strong>
                    <p>Reduza {formatCurrency(Math.abs(remainingAfterCents))} antes de salvar.</p>
                  </div>
                </div>
              )}

              <div className="form-section-header">
                <div>
                  <h3>Itens efetivamente entregues</h3>
                  <p>Zere os produtos não entregues e ajuste quantidades ou preços conforme a NF.</p>
                </div>
                <label className="search-field compact-search">
                  <Icon name="search" />
                  <span className="sr-only">Buscar produto</span>
                  <input
                    type="search"
                    placeholder="Buscar produto"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              <div className="order-item-list">
                <div className="order-item-head invoice-item-head">
                  <span>Produto</span><span>Pedido</span><span>Entregue</span><span>Preço na NF</span><span>Total</span>
                </div>
                {filteredItems.map((item) => {
                  const quantity = Number(quantities[item.commitmentItemId]) || 0;
                  const requested = requestedQuantities[item.commitmentItemId] ?? 0;
                  const price = prices[item.commitmentItemId]
                    ? Number(prices[item.commitmentItemId])
                    : item.unitPriceCents / 100;
                  const aboveRequested = quantity > requested + 0.000001;
                  return (
                    <div className={`order-item-row invoice-item-row ${quantity > 0 ? "selected" : ""}`} key={item.commitmentItemId}>
                      <div className="product-cell">
                        <span className="item-number">{item.lineNumber}</span>
                        <span><strong>{item.description}</strong><small>{item.unit}</small></span>
                      </div>
                      <div><strong>{formatQuantity(requested)}</strong><small>{item.unit} pedidos</small></div>
                      <label>
                        <span className="mobile-field-label">Entregue</span>
                        <input
                          aria-label={`Quantidade entregue de ${item.description}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.001"
                          value={quantities[item.commitmentItemId] ?? ""}
                          onChange={(event) => setQuantities((current) => ({ ...current, [item.commitmentItemId]: event.target.value }))}
                        />
                        {aboveRequested && <small className="input-warning">Acima do pedido</small>}
                      </label>
                      <label>
                        <span className="mobile-field-label">Preço na NF</span>
                        <div className="input-prefix-wrap compact">
                          <span className="input-prefix">R$</span>
                          <input
                            aria-label={`Preço na nota de ${item.description}`}
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            value={prices[item.commitmentItemId] ?? (item.unitPriceCents / 100).toFixed(2)}
                            onChange={(event) => setPrices((current) => ({ ...current, [item.commitmentItemId]: event.target.value }))}
                          />
                        </div>
                      </label>
                      <strong className="line-total">{formatCurrency(Math.round(quantity * price * 100))}</strong>
                    </div>
                  );
                })}
              </div>

              <label className="field">
                <span>Observações da NF <small>opcional</small></span>
                <textarea
                  rows={2}
                  placeholder="Ex.: fornecedor não entregou tomate e cebola."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </>
          ) : null}
          {error && <div className="form-error"><Icon name="alert" />{error}</div>}
        </div>

        <footer className="modal-footer">
          <div className="modal-total">
            <span>Valor efetivo da nota</span>
            <strong>{formatCurrency(effectiveTotalCents)}</strong>
          </div>
          <div className="modal-actions">
            <button className="button button-ghost" type="button" onClick={handleClose}>Cancelar</button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving || loading || selectedItems.length === 0 || exceedsLimit || !number.trim()}
            >
              {saving ? "Salvando…" : order?.invoice ? "Salvar alterações da NF" : "Registrar nota fiscal"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
