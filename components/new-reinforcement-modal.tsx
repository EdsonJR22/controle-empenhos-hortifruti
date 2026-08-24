"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "../lib/client-api";
import { formatCurrency, formatQuantity, todayIso } from "../lib/format";
import type {
  ApiErrorBody,
  CommitmentDetail,
  CreateReinforcementPayload,
} from "../lib/types";
import { Icon } from "./icon";
import { Modal } from "./modal";

export function NewReinforcementModal({
  open,
  commitment,
  onClose,
  onCreated,
}: {
  open: boolean;
  commitment: CommitmentDetail;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [reference, setReference] = useState("");
  const [reinforcementDate, setReinforcementDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedItems = useMemo(
    () =>
      commitment.items
        .map((item) => ({
          item,
          addedQuantity: Number(quantities[item.id]) || 0,
        }))
        .filter(({ addedQuantity }) => addedQuantity > 0),
    [commitment.items, quantities],
  );

  const addedTotalCents = useMemo(
    () =>
      selectedItems.reduce(
        (sum, { item, addedQuantity }) =>
          sum + Math.round(addedQuantity * item.unitPriceCents),
        0,
      ),
    [selectedItems],
  );

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return commitment.items;
    return commitment.items.filter(
      (item) =>
        item.description.toLocaleLowerCase("pt-BR").includes(normalized) ||
        String(item.lineNumber).includes(normalized),
    );
  }, [commitment.items, search]);

  const reset = () => {
    setReference("");
    setReinforcementDate(todayIso());
    setNotes("");
    setSearch("");
    setQuantities({});
    setError("");
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const payload: CreateReinforcementPayload = {
      reference,
      reinforcementDate,
      notes,
      items: selectedItems.map(({ item, addedQuantity }) => ({
        commitmentItemId: item.id,
        addedQuantity,
      })),
    };

    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/commitments/${commitment.id}/reinforcements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as
        | { reinforcement: { id: string } }
        | ApiErrorBody;
      if (!response.ok || !("reinforcement" in body)) {
        throw new Error(
          "error" in body ? body.error : "Não foi possível registrar o reforço.",
        );
      }
      reset();
      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível registrar o reforço.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Reforçar NE ${commitment.number}`}
      subtitle="Acrescente somente as quantidades autorizadas no documento de reforço."
      size="wide"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body stack-lg">
          <div className="form-grid reinforcement-form-grid">
            <label className="field">
              <span>Documento ou referência <small>opcional</small></span>
              <input
                placeholder="Ex.: 1º reforço / NE 400150"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
              <small className="field-help">Se ficar vazio, o sistema identifica pela data.</small>
            </label>
            <label className="field">
              <span>Data do reforço</span>
              <input
                required
                type="date"
                value={reinforcementDate}
                onChange={(event) => setReinforcementDate(event.target.value)}
              />
            </label>
          </div>

          <div className="reinforcement-summary-strip">
            <div>
              <span>Valor atual da NE</span>
              <strong>{formatCurrency(commitment.totalCents)}</strong>
            </div>
            <div>
              <span>Acréscimo deste reforço</span>
              <strong>{formatCurrency(addedTotalCents)}</strong>
            </div>
            <div>
              <span>Novo valor autorizado</span>
              <strong>{formatCurrency(commitment.totalCents + addedTotalCents)}</strong>
            </div>
          </div>

          <div className="form-section-header">
            <div>
              <h3>Quantidades reforçadas</h3>
              <p>O acréscimo financeiro é calculado pelo preço unitário já cadastrado na NE.</p>
            </div>
            <label className="search-field compact-search">
              <Icon name="search" />
              <span className="sr-only">Buscar item</span>
              <input
                type="search"
                placeholder="Buscar item"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="reinforcement-item-list">
            <div className="reinforcement-item-head">
              <span>Produto</span>
              <span>Autorizado atual</span>
              <span>Já pedido</span>
              <span>Reforçar em</span>
              <span>Novo autorizado</span>
            </div>
            {filteredItems.map((item) => {
              const addedQuantity = Number(quantities[item.id]) || 0;
              const exceeded = item.balanceQuantity < -0.000001;
              return (
                <div
                  className={`reinforcement-item-row ${exceeded ? "exceeded" : ""} ${addedQuantity > 0 ? "selected" : ""}`}
                  key={item.id}
                >
                  <div className="product-cell">
                    <span className="item-number">{item.lineNumber}</span>
                    <span>
                      <strong>{item.description}</strong>
                      <small>{formatCurrency(item.unitPriceCents)} / {item.unit}</small>
                    </span>
                  </div>
                  <div>
                    <strong>{formatQuantity(item.contractedQuantity)}</strong>
                    <small>{item.unit}</small>
                  </div>
                  <div className={exceeded ? "negative" : ""}>
                    <strong>{formatQuantity(item.orderedQuantity)}</strong>
                    <small>{item.unit}</small>
                  </div>
                  <label>
                    <span className="mobile-field-label">Quantidade do reforço</span>
                    <input
                      aria-label={`Quantidade de reforço para ${item.description}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.001"
                      placeholder="0"
                      value={quantities[item.id] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="reinforced-total">
                    <strong>{formatQuantity(item.contractedQuantity + addedQuantity)}</strong>
                    <small>{item.unit}</small>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="field">
            <span>Observações <small>opcional</small></span>
            <textarea
              rows={2}
              placeholder="Registre informações importantes do documento de reforço."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {error && <div className="form-error"><Icon name="alert" />{error}</div>}
        </div>

        <footer className="modal-footer">
          <div className="modal-total">
            <span>Aumento no valor da NE</span>
            <strong>{formatCurrency(addedTotalCents)}</strong>
          </div>
          <div className="modal-actions">
            <button className="button button-ghost" type="button" onClick={close}>Cancelar</button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving || selectedItems.length === 0}
            >
              {saving ? "Registrando…" : "Registrar reforço"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
