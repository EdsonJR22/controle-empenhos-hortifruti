"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "../lib/client-api";
import { formatCurrency, todayIso } from "../lib/format";
import type { ApiErrorBody, CreateCommitmentPayload } from "../lib/types";
import { Icon } from "./icon";
import { Modal } from "./modal";

type DraftItem = {
  key: string;
  lineNumber: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

const newDraftItem = (lineNumber: number): DraftItem => ({
  key: crypto.randomUUID(),
  lineNumber: String(lineNumber),
  description: "",
  unit: "Kg",
  quantity: "",
  unitPrice: "",
});

export function NewCommitmentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [number, setNumber] = useState("");
  const [supplier, setSupplier] = useState("Rede Terra");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newDraftItem(1)]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totalCents = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Math.round(
            (Number(item.quantity) || 0) *
              (Number(item.unitPrice) || 0) *
              100,
          ),
        0,
      ),
    [items],
  );

  const updateItem = (key: string, field: keyof DraftItem, value: string) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    const highest = items.reduce(
      (value, item) => Math.max(value, Number(item.lineNumber) || 0),
      0,
    );
    setItems((current) => [...current, newDraftItem(highest + 1)]);
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const payload: CreateCommitmentPayload = {
      number,
      supplier,
      issueDate,
      notes,
      items: items.map((item) => ({
        lineNumber: Number(item.lineNumber),
        description: item.description,
        unit: item.unit,
        contractedQuantity: Number(item.quantity),
        unitPriceCents: Math.round(Number(item.unitPrice) * 100),
      })),
    };

    setSaving(true);
    try {
      const response = await apiFetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        | { commitment: { id: string } }
        | ApiErrorBody;
      if (!response.ok || !("commitment" in body)) {
        throw new Error("error" in body ? body.error : "Não foi possível criar a NE.");
      }
      onCreated(body.commitment.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível criar a NE.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cadastrar nova NE"
      subtitle="Informe os itens exatamente como aparecem na nota de empenho."
      size="wide"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body stack-lg">
          <div className="form-grid form-grid-3">
            <label className="field">
              <span>Número da NE</span>
              <div className="input-prefix-wrap">
                <span className="input-prefix">NE</span>
                <input
                  required
                  inputMode="numeric"
                  placeholder="400150"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                />
              </div>
            </label>
            <label className="field">
              <span>Fornecedor</span>
              <input
                required
                placeholder="Nome do fornecedor"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Data da NE</span>
              <input
                required
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
            </label>
          </div>

          <div className="form-section-header">
            <div>
              <h3>Itens empenhados</h3>
              <p>Quantidade e preço unitário formam o teto financeiro da NE.</p>
            </div>
            <button className="button button-secondary button-small" type="button" onClick={addItem}>
              <Icon name="plus" />
              Adicionar item
            </button>
          </div>

          <div className="item-editor">
            <div className="item-editor-head">
              <span>Item</span>
              <span>Descrição</span>
              <span>Und.</span>
              <span>Quantidade</span>
              <span>Valor unitário</span>
              <span>Total</span>
              <span aria-hidden="true" />
            </div>
            {items.map((item) => {
              const lineTotal = Math.round(
                (Number(item.quantity) || 0) *
                  (Number(item.unitPrice) || 0) *
                  100,
              );
              return (
                <div className="item-editor-row" key={item.key}>
                  <label>
                    <span className="mobile-field-label">Item</span>
                    <input
                      required
                      aria-label="Número do item"
                      type="number"
                      min="1"
                      step="1"
                      value={item.lineNumber}
                      onChange={(event) => updateItem(item.key, "lineNumber", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mobile-field-label">Descrição</span>
                    <input
                      required
                      aria-label="Descrição do item"
                      placeholder="Ex.: Batata inglesa"
                      value={item.description}
                      onChange={(event) => updateItem(item.key, "description", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mobile-field-label">Unidade</span>
                    <select
                      aria-label="Unidade"
                      value={item.unit}
                      onChange={(event) => updateItem(item.key, "unit", event.target.value)}
                    >
                      <option>Kg</option>
                      <option>Dz</option>
                      <option>Un</option>
                      <option>Cx</option>
                      <option>Maço</option>
                    </select>
                  </label>
                  <label>
                    <span className="mobile-field-label">Quantidade</span>
                    <input
                      required
                      aria-label="Quantidade empenhada"
                      inputMode="decimal"
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, "quantity", event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mobile-field-label">Valor unitário</span>
                    <div className="input-prefix-wrap compact">
                      <span className="input-prefix">R$</span>
                      <input
                        required
                        aria-label="Valor unitário"
                        inputMode="decimal"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unitPrice}
                        onChange={(event) => updateItem(item.key, "unitPrice", event.target.value)}
                      />
                    </div>
                  </label>
                  <span className="line-total">{formatCurrency(lineTotal)}</span>
                  <button
                    className="icon-button danger-hover"
                    type="button"
                    aria-label={`Excluir item ${item.lineNumber}`}
                    disabled={items.length === 1}
                    onClick={() => removeItem(item.key)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              );
            })}
          </div>

          <label className="field">
            <span>Observações <small>opcional</small></span>
            <textarea
              rows={3}
              placeholder="Registre particularidades desta NE."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {error && <div className="form-error"><Icon name="alert" />{error}</div>}
        </div>

        <footer className="modal-footer">
          <div className="modal-total">
            <span>Valor total da NE</span>
            <strong>{formatCurrency(totalCents)}</strong>
          </div>
          <div className="modal-actions">
            <button className="button button-ghost" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Cadastrar NE"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
