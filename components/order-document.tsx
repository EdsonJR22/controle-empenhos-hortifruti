"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/client-api";
import { formatCurrency, formatDate, formatQuantity } from "../lib/format";
import type { OrderDetail, OrderItemDetail } from "../lib/types";
import { Icon } from "./icon";

export type OrderDocumentMode = "order" | "invoice";

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function lineTotalCents(item: OrderItemDetail) {
  return Math.round(item.quantity * item.unitPriceCents);
}

function safeDocumentTitle(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

export function OrderDocumentView({ mode }: { mode: OrderDocumentMode }) {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [generatedAt] = useState(() => new Date());
  const printTriggered = useRef(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    void apiFetch(`/api/orders/${id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as
          | { order: OrderDetail }
          | { error: string };
        if (!response.ok || !("order" in body)) {
          throw new Error(
            "error" in body ? body.error : "Não foi possível carregar o documento.",
          );
        }
        if (mode === "invoice" && !body.order.invoice) {
          throw new Error("Este pedido ainda não possui uma nota fiscal registrada.");
        }
        setOrder(body.order);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar o documento.",
        );
      });

    return () => controller.abort();
  }, [id, mode]);

  useEffect(() => {
    if (!order) return;
    const previousTitle = document.title;
    const nextTitle =
      mode === "invoice" && order.invoice
        ? `Espelho NF ${order.invoice.number} - NE ${order.commitmentNumber}`
        : `Pedido ${order.reference} - NE ${order.commitmentNumber}`;
    document.title = safeDocumentTitle(nextTitle);
    return () => {
      document.title = previousTitle;
    };
  }, [mode, order]);

  useEffect(() => {
    if (!order || printTriggered.current) return;
    const requested = new URLSearchParams(window.location.search).get("print") === "1";
    if (!requested) return;
    printTriggered.current = true;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [order]);

  if (error) {
    return (
      <div className="document-view">
        <Link className="back-link" href="/">
          <Icon name="arrow-left" /> Voltar para a visão geral
        </Link>
        <section className="error-state">
          <Icon name="alert" />
          <div>
            <strong>Não foi possível preparar o documento</strong>
            <p>{error}</p>
          </div>
        </section>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="document-view">
        <div className="document-paper document-loading">
          <div className="skeleton skeleton-detail" />
        </div>
      </div>
    );
  }

  const invoice = order.invoice;
  const isInvoice = mode === "invoice" && Boolean(invoice);
  const items = isInvoice ? invoice!.items : order.items;
  const documentDate = isInvoice ? invoice!.invoiceDate : order.orderDate;
  const calculatedTotalCents = isInvoice
    ? invoice!.calculatedTotalCents
    : order.calculatedTotalCents;
  const totalCents = isInvoice ? invoice!.totalCents : order.requestedTotalCents;
  const notes = isInvoice ? invoice!.notes : order.notes;
  const hasAdjustment = Math.abs(totalCents - calculatedTotalCents) > 1;

  return (
    <div className="document-view">
      <div className="document-toolbar">
        <Link className="button button-secondary" href={`/empenhos/${order.commitmentId}`}>
          <Icon name="arrow-left" /> Voltar para a NE
        </Link>
        <div>
          <strong>{isInvoice ? "Espelho da NF pronto" : "Pedido pronto"}</strong>
          <span>Na janela de impressão, escolha “Salvar como PDF”.</span>
        </div>
        <button className="button button-primary" type="button" onClick={() => window.print()}>
          <Icon name="file" /> Salvar como PDF
        </button>
      </div>

      <article className="document-paper">
        <header className="document-header">
          <div className="document-brand">
            <span className="document-brand-mark" aria-hidden="true">
              <Image
                src="/simbolo-intendencia.svg"
                alt=""
                width={76}
                height={40}
                priority
              />
            </span>
            <div>
              <strong>HortiControl</strong>
              <span>Controle de Notas de Empenho</span>
            </div>
          </div>
          <div className="document-heading">
            <span>{isInvoice ? "Espelho de nota fiscal" : "Pedido de fornecimento"}</span>
            <h1>{isInvoice ? `NF ${invoice!.number}` : order.reference}</h1>
          </div>
        </header>

        <section className="document-meta-grid" aria-label="Identificação do documento">
          <div className="document-meta-wide">
            <span>Fornecedor</span>
            <strong>{order.supplier}</strong>
          </div>
          <div>
            <span>Nota de empenho</span>
            <strong>NE {order.commitmentNumber}</strong>
          </div>
          <div>
            <span>Emissão da NE</span>
            <strong>{formatDate(order.commitmentIssueDate)}</strong>
          </div>
          {isInvoice ? (
            <>
              <div>
                <span>Pedido de origem</span>
                <strong>{order.reference}</strong>
              </div>
              <div>
                <span>Data do pedido</span>
                <strong>{formatDate(order.orderDate)}</strong>
              </div>
              <div>
                <span>Número da NF</span>
                <strong>{invoice!.number}</strong>
              </div>
              <div>
                <span>Data da NF</span>
                <strong>{formatDate(documentDate)}</strong>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Referência do pedido</span>
                <strong>{order.reference}</strong>
              </div>
              <div>
                <span>Data do pedido</span>
                <strong>{formatDate(documentDate)}</strong>
              </div>
            </>
          )}
        </section>

        <section className="document-items" aria-labelledby="document-items-title">
          <div className="document-section-heading">
            <div>
              <span>{isInvoice ? "Itens entregues" : "Itens solicitados"}</span>
              <h2 id="document-items-title">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </h2>
            </div>
          </div>
          <div className="document-table-wrap">
            <table className="document-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Descrição</th>
                  <th>Unidade</th>
                  <th>Quantidade</th>
                  <th>Valor unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.commitmentItemId}>
                    <td>{item.lineNumber}</td>
                    <th scope="row">{item.description}</th>
                    <td>{item.unit}</td>
                    <td>{formatQuantity(item.quantity)}</td>
                    <td>{formatCurrency(item.unitPriceCents)}</td>
                    <td>{formatCurrency(lineTotalCents(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="document-summary" aria-label="Totais do documento">
          {isInvoice && (
            <>
              <div>
                <span>Valor do pedido original</span>
                <strong>{formatCurrency(order.requestedTotalCents)}</strong>
              </div>
              <div>
                <span>Diferença para o pedido</span>
                <strong>{formatCurrency(totalCents - order.requestedTotalCents)}</strong>
              </div>
            </>
          )}
          {hasAdjustment && (
            <div>
              <span>Soma dos itens</span>
              <strong>{formatCurrency(calculatedTotalCents)}</strong>
            </div>
          )}
          <div className="document-grand-total">
            <span>{hasAdjustment ? "Total informado" : "Total"}</span>
            <strong>{formatCurrency(totalCents)}</strong>
          </div>
        </section>

        {notes && (
          <section className="document-notes">
            <span>Observações</span>
            <p>{notes}</p>
          </section>
        )}

        {isInvoice && (
          <p className="document-disclaimer">
            Este documento é um espelho para conferência e controle administrativo. Ele não
            substitui a NF-e, o XML ou o DANFE emitidos pelo fornecedor.
          </p>
        )}

        <footer className="document-footer">
          <span>Gerado em {formatGeneratedAt(generatedAt)}</span>
          <span>HortiControl · NE {order.commitmentNumber}</span>
        </footer>
      </article>
    </div>
  );
}
