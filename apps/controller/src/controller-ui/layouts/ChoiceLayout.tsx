import type { ChoiceLayoutModel } from "./models.js";
import { ReadyPanel } from "../common/ReadyPanel.js";

interface ChoiceLayoutProps {
  model: ChoiceLayoutModel;
}

export function ChoiceLayout({ model }: ChoiceLayoutProps) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: "1.3rem", color: "var(--text-main)" }}>{model.title}</strong>
        {model.subtitle ? (
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{model.subtitle}</span>
        ) : null}
      </header>

      {model.helperText ? (
        <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.4 }}>{model.helperText}</p>
      ) : null}

      {model.ready ? <ReadyPanel ready={model.ready} /> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {model.choices.map((choice) => {
          const isDisabled = model.disabled || choice.disabled;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={choice.onSelect}
              disabled={isDisabled}
              style={{
                textAlign: "left",
                border: isDisabled
                  ? "1px solid rgba(148, 163, 184, 0.2)"
                  : "1px solid rgba(34, 211, 238, 0.3)",
                borderRadius: "var(--radius-md)",
                background: isDisabled
                  ? "rgba(15, 23, 42, 0.4)"
                  : "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(8, 47, 73, 0.5) 100%)",
                color: "inherit",
                padding: "12px 14px",
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? "default" : "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>{choice.label}</strong>
              {choice.description ? (
                <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{choice.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {model.stats?.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {model.stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: stat.highlighted
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.6) 100%)"
                  : "rgba(15, 23, 42, 0.52)",
                border: stat.highlighted
                  ? "1px solid rgba(245, 158, 11, 0.35)"
                  : "1px solid transparent",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                transition: "all 0.2s ease"
              }}
            >
              <span style={{ color: stat.highlighted ? "var(--text-main)" : "var(--text-muted)" }}>
                {stat.label}
              </span>
              <strong style={{
                color: stat.highlighted ? "#fbbf24" : "inherit",
                fontSize: stat.highlighted ? "1.05rem" : "1rem"
              }}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      ) : null}

      {model.feed?.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            📋
          </strong>
          {model.feed.map((entry, index) => (
            <span
              key={`${entry}-${index}`}
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                paddingLeft: 8,
                borderLeft: "2px solid rgba(148, 163, 184, 0.2)"
              }}
            >
              {entry}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
