"use client";

import { formatCurrency, formatDate, formatQuantity } from "../lib/format";
import type { ReinforcementSummary } from "../lib/types";
import { Modal } from "./modal";

export function ReinforcementDetailModal({
  reinforcement,
  commitmentNumber,
  onClose,
}: {
  reinforcement: ReinforcementSummary | null;
  commitmentNumber: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(reinforcement)}
      onClose={onClose}
      title={reinforcement?.reference ?? "Detalhes do reforço"}
      subtitle={
        reinforcement
          ? `NE ${commitmentNumber} · Reforço registrado em ${formatDate(reinforcement.reinforcementDate)}`
          : undefined
      }
      size="large"
    >
      {reinforcement && (
        <>
          <div className="modal-body stack-lg">
            <div className="reinforcement-summary-strip">
              <div>
                <span>Data do reforço</span>
                <strong>{formatDate(reinforcement.reinforcementDate)}</strong>
              </div>
              <div>
                <span>Itens reforçados</span>
                <strong>{reinforcement.itemCount}</strong>
              </div>
              <div>
                <span>Valor acrescentado</span>
                <strong>{formatCurrency(reinforcement.totalCents)}</strong>
              </div>
            </div>

            {reinforcement.notes && (
              <section className="reinforcement-detail-notes">
                <span>Observações</span>
                <p>{reinforcement.notes}</p>
              </section>
            )}

            <section aria-labelledby="reinforcement-detail-items-title">
              <div className="form-section-header">
                <div>
                  <h3 id="reinforcement-detail-items-title">Itens reforçados</h3>
                  <p>Quantidades acrescentadas por este reforço.</p>
                </div>
              </div>

              <div className="reinforcement-detail-list">
                <div className="reinforcement-detail-head" aria-hidden="true">
                  <span>Produto</span>
                  <span>Unidade</span>
                  <span>Quantidade reforçada</span>
                  <span>Preço unitário</span>
                  <span>Acréscimo</span>
                </div>
                {reinforcement.items.map((item) => (
                  <div className="reinforcement-detail-row" key={item.commitmentItemId}>
                    <div className="product-cell">
                      <span className="item-number">{item.lineNumber}</span>
                      <span>
                        <strong>{item.description}</strong>
                        <small>Item {item.lineNumber} da NE</small>
                      </span>
                    </div>
                    <div>
                      <span className="reinforcement-detail-label">Unidade</span>
                      <strong>{item.unit}</strong>
                    </div>
                    <div className="reinforcement-detail-quantity">
                      <span className="reinforcement-detail-label">Quantidade reforçada</span>
                      <strong>+ {formatQuantity(item.addedQuantity)} {item.unit}</strong>
                    </div>
                    <div>
                      <span className="reinforcement-detail-label">Preço unitário</span>
                      <strong>{formatCurrency(item.unitPriceCents)}</strong>
                    </div>
                    <div className="reinforcement-detail-total">
                      <span className="reinforcement-detail-label">Acréscimo</span>
                      <strong>{formatCurrency(item.addedTotalCents)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="modal-footer">
            <div className="modal-total">
              <span>Total acrescentado à NE</span>
              <strong>{formatCurrency(reinforcement.totalCents)}</strong>
            </div>
            <div className="modal-actions">
              <button className="button button-primary" type="button" onClick={onClose}>
                Fechar
              </button>
            </div>
          </footer>
        </>
      )}
    </Modal>
  );
}
