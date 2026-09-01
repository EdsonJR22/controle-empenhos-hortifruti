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
  CreateOrderPayload,
  OrderDetail,
} from "../lib/types";
import { Icon } from "./icon";
import { Modal } from "./modal";

export function NewOrderModal({
  open,
  commitment,
  orderId = null,
  onClose,
  onSaved,
}: {
  open: boolean;
  commitment: CommitmentDetail;
  orderId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(orderId);
  const [reference, setReference] = useState("");
  const [orderDate, setOrderDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [originalQuantities, setOriginalQuantities] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [informedTotal, setInformedTotal] = useState("");
  const [originalTotalCents, setOriginalTotalCents] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setReference("");
    setOrderDate(todayIso());
    setNotes("");
    setSearch("");
    setQuantities({});
    setOriginalQuantities({});
    setPrices({});
    setInformedTotal("");
    setOriginalTotalCents(0);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!orderId) {
        resetForm();
        return;
      }
      setLoading(true);
      setError("");
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
          setReference(body.order.reference);
          setOrderDate(body.order.orderDate);
          setNotes(body.order.notes);
          setQuantities(
            Object.fromEntries(
              body.order.items.map((item) => [
                item.commitmentItemId,
                String(item.quantity),
              ]),
            ),
          );
          setOriginalQuantities(
            Object.fromEntries(
              body.order.items.map((item) => [
                item.commitmentItemId,
                item.quantity,
              ]),
            ),
          );
          setPrices(
            Object.fromEntries(
              body.order.items.map((item) => [
                item.commitmentItemId,
                (item.unitPriceCents / 100).toFixed(2),
              ]),
            ),
          );
          setInformedTotal(
            body.order.requestedTotalCents !== body.order.calculatedTotalCents
              ? (body.order.requestedTotalCents / 100).toFixed(2)
              : "",
          );
          setOriginalTotalCents(body.order.requestedTotalCents);
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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedItems = useMemo(
    () =>
      commitment.items.flatMap((item) => {
        const quantity = Number(quantities[item.id]);
        if (!Number.isFinite(quantity) || quantity <= 0) return [];
        const priceValue = prices[item.id];
        const unitPriceCents = priceValue
          ? Math.round(Number(priceValue) * 100)
          : item.unitPriceCents;
        return [{ item, quantity, unitPriceCents }];
      }),
    [commitment.items, prices, quantities],
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
  const availableCents = commitment.balanceCents + originalTotalCents;
  const remainingAfterCents = availableCents - effectiveTotalCents;
  const exceedsLimit = remainingAfterCents < 0;
  const filteredItems = commitment.items.filter((item) =>
    item.description
      .toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (exceedsLimit || loading) return;
    setError("");
    const payload: CreateOrderPayload = {
      reference,
      orderDate,
      notes,
      informedTotalCents,
      items: selectedItems.map((row) => ({
        commitmentItemId: row.item.id,
        quantity: row.quantity,
        unitPriceCents: row.unitPriceCents,
      })),
    };
    setSaving(true);
    try {
      const response = await apiFetch(
        editing
          ? `/api/orders/${orderId}`
          : `/api/commitments/${commitment.id}/orders`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as
        | { order: { id: string } }
        | ApiErrorBody;
      if (!response.ok || !("order" in body)) {
        throw new Error(
          "error" in body ? body.error : "Não foi possível salvar o pedido.",
        );
      }
      resetForm();
      onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível salvar o pedido.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${editing ? "Editar pedido" : "Novo pedido"} · NE ${commitment.number}`}
      subtitle={`Saldo disponível para este lançamento: ${formatCurrency(availableCents)}`}
      size="wide"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body stack-lg">
          {loading ? (
            <div className="modal-loading">Carregando dados do pedido…</div>
          ) : (
            <>
              <div className="form-grid form-grid-3">
                <label className="field">
                  <span>Referência do pedido</span>
                  <input
                    placeholder="Ex.: Pedido semanal 08"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Data do pedido</span>
                  <input
                    required
                    type="date"
                    value={orderDate}
                    onChange={(event) => setOrderDate(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Valor reservado <small>opcional</small></span>
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
                  <small className="field-help">Preencha apenas se o total do pedido diferir do cálculo.</small>
                </label>
              </div>

              <div className="order-summary-strip">
                <div><span>Itens selecionados</span><strong>{selectedItems.length}</strong></div>
                <div><span>Total calculado</span><strong>{formatCurrency(calculatedTotalCents)}</strong></div>
                <div><span>Valor reservado</span><strong>{formatCurrency(effectiveTotalCents)}</strong></div>
                <div className={exceedsLimit ? "negative" : "positive"}>
                  <span>Saldo após o pedido</span><strong>{formatCurrency(remainingAfterCents)}</strong>
                </div>
              </div>

              {exceedsLimit && (
                <div className="limit-alert">
                  <Icon name="alert" />
                  <div>
                    <strong>O pedido ultrapassa o saldo da NE</strong>
                    <p>Reduza {formatCurrency(Math.abs(remainingAfterCents))} antes de salvar.</p>
                  </div>
                </div>
              )}

              <div className="form-section-header">
                <div>
                  <h3>Quantidades do pedido</h3>
                  <p>Informe o que está sendo solicitado. A entrega real será registrada na NF.</p>
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
                <div className="order-item-head">
                  <span>Produto</span><span>Saldo de qtd.</span><span>Quantidade</span><span>Preço unitário</span><span>Total</span>
                </div>
                {filteredItems.map((item) => {
                  const quantity = Number(quantities[item.id]) || 0;
                  const price = prices[item.id]
                    ? Number(prices[item.id])
                    : item.unitPriceCents / 100;
                  const availableQuantity =
                    item.balanceQuantity + (originalQuantities[item.id] ?? 0);
                  const negativeBalance = availableQuantity < -0.000001;
                  const emptyBalance = Math.abs(availableQuantity) < 0.000001;
                  const willExceedItem =
                    quantity > 0.000001 && quantity > availableQuantity + 0.000001;
                  return (
                    <div
                      className={`order-item-row ${quantity > 0 ? "selected" : ""} ${negativeBalance ? "balance-negative" : emptyBalance ? "balance-empty" : ""}`}
                      key={item.id}
                    >
                      <div className="product-cell">
                        <span className="item-number">{item.lineNumber}</span>
                        <span>
                          <strong>{item.description}</strong>
                          <small>{item.unit}</small>
                          {negativeBalance && (
                            <span className="row-limit-label">
                              <Icon name="alert" /> Limite extrapolado
                            </span>
                          )}
                          {emptyBalance && (
                            <span className="row-empty-label">
                              <Icon name="alert" /> Saldo zerado
                            </span>
                          )}
                        </span>
                      </div>
                      <div className={negativeBalance ? "negative" : emptyBalance ? "empty-balance" : ""}>
                        <strong>{formatQuantity(availableQuantity)}</strong><small>{item.unit} disponíveis</small>
                      </div>
                      <label>
                        <span className="mobile-field-label">Quantidade</span>
                        <input
                          aria-label={`Quantidade de ${item.description}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.001"
                          placeholder="0"
                          value={quantities[item.id] ?? ""}
                          onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))}
                        />
                        {willExceedItem && <small className="input-warning">Acima do saldo do item</small>}
                      </label>
                      <label>
                        <span className="mobile-field-label">Preço unitário</span>
                        <div className="input-prefix-wrap compact">
                          <span className="input-prefix">R$</span>
                          <input
                            aria-label={`Preço de ${item.description}`}
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            value={prices[item.id] ?? (item.unitPriceCents / 100).toFixed(2)}
                            onChange={(event) => setPrices((current) => ({ ...current, [item.id]: event.target.value }))}
                          />
                        </div>
                      </label>
                      <strong className="line-total">{formatCurrency(Math.round(quantity * price * 100))}</strong>
                    </div>
                  );
                })}
              </div>

              <label className="field">
                <span>Observações <small>opcional</small></span>
                <textarea
                  rows={2}
                  placeholder="Ex.: entrega solicitada para sexta-feira."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </>
          )}
          {error && <div className="form-error"><Icon name="alert" />{error}</div>}
        </div>

        <footer className="modal-footer">
          <div className="modal-total">
            <span>Total que ficará reservado</span>
            <strong>{formatCurrency(effectiveTotalCents)}</strong>
          </div>
          <div className="modal-actions">
            <button className="button button-ghost" type="button" onClick={handleClose}>Cancelar</button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving || loading || selectedItems.length === 0 || exceedsLimit}
            >
              {saving ? "Salvando…" : editing ? "Salvar alterações" : "Registrar pedido"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
