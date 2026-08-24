"use client";

import { useEffect } from "react";
import { Icon } from "./icon";

export function Modal({
  open,
  title,
  subtitle,
  size = "large",
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: "medium" | "large" | "wide";
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-layer" role="presentation">
      <button className="modal-backdrop" type="button" onClick={onClose} aria-label="Fechar" />
      <section
        className={`modal-card modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
