// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { useEffect, useRef, useState } from "react";
import { ReadyPanel } from "../common/ReadyPanel.js";
import type {
  SecretCardActionModel,
  SecretCardLayoutModel,
  SecretCardRoleTone
} from "./models.js";

interface SecretCardLayoutProps {
  model: SecretCardLayoutModel;
}

const roleTones: Record<
  SecretCardRoleTone,
  { background: string; border: string; color: string }
> = {
  primary: {
    background: "rgba(34, 197, 94, 0.16)",
    border: "rgba(34, 197, 94, 0.55)",
    color: "#86efac"
  },
  watch: {
    background: "rgba(248, 113, 113, 0.16)",
    border: "rgba(248, 113, 113, 0.55)",
    color: "#fca5a5"
  },
  guess: {
    background: "rgba(96, 165, 250, 0.16)",
    border: "rgba(96, 165, 250, 0.55)",
    color: "#93c5fd"
  },
  bench: {
    background: "rgba(148, 163, 184, 0.14)",
    border: "rgba(148, 163, 184, 0.4)",
    color: "#cbd5e1"
  }
};

const actionTones = {
  positive: {
    background: "linear-gradient(180deg, #22c55e, #15803d)",
    border: "#4ade80",
    color: "#f0fdf4"
  },
  neutral: {
    background: "linear-gradient(180deg, #475569, #1e293b)",
    border: "#94a3b8",
    color: "#e2e8f0"
  },
  danger: {
    background: "linear-gradient(180deg, #ef4444, #b91c1c)",
    border: "#fca5a5",
    color: "#fef2f2"
  }
} as const;

function useSmoothCountdown(remainingMs: number | null | undefined): number | null {
  const [value, setValue] = useState<number | null>(remainingMs ?? null);
  const targetRef = useRef<number | null>(null);

  useEffect(() => {
    if (remainingMs === null || remainingMs === undefined) {
      targetRef.current = null;
      setValue(null);
      return;
    }

    targetRef.current = Date.now() + remainingMs;
    setValue(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      if (targetRef.current !== null) {
        setValue(Math.max(0, targetRef.current - Date.now()));
      }
    }, 100);

    return () => window.clearInterval(handle);
  }, []);

  return value;
}

function TimerRing({
  remainingMs,
  durationMs
}: {
  remainingMs: number | null;
  durationMs: number;
}) {
  const duration = Math.max(1, durationMs);
  const remaining = remainingMs ?? duration;
  const ratio = Math.max(0, Math.min(1, remaining / duration));
  const seconds = Math.ceil(remaining / 1_000);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const color = remaining <= 10_000 ? "#f87171" : ratio > 0.4 ? "#4ade80" : "#fbbf24";

  return (
    <div
      aria-label={`${seconds}`}
      style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth="7"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 120ms linear, stroke 300ms ease" }}
        />
      </svg>
      <strong
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          color,
          fontSize: "1.6rem",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {seconds}
      </strong>
    </div>
  );
}

function ActionButton({
  action,
  disabled
}: {
  action: SecretCardActionModel;
  disabled: boolean;
}) {
  const tone = actionTones[action.tone];
  const isDisabled = disabled || action.disabled;

  return (
    <button
      type="button"
      onClick={action.onPress}
      disabled={isDisabled}
      style={{
        width: "100%",
        minHeight: 64,
        border: `1px solid ${tone.border}`,
        borderRadius: "var(--radius-lg)",
        background: tone.background,
        color: tone.color,
        fontSize: "1.1rem",
        fontWeight: 700,
        display: "grid",
        gap: 2,
        placeContent: "center",
        opacity: isDisabled ? 0.4 : 1,
        boxShadow: isDisabled ? "none" : "var(--button-shadow)",
        touchAction: "manipulation"
      }}
    >
      <span>{action.label}</span>
      {action.sublabel ? (
        <span style={{ fontSize: "0.78rem", fontWeight: 500, opacity: 0.85 }}>
          {action.sublabel}
        </span>
      ) : null}
    </button>
  );
}

export function SecretCardLayout({ model }: SecretCardLayoutProps) {
  const timerValue = useSmoothCountdown(model.timer?.remainingMs);
  const countdownValue = useSmoothCountdown(model.countdownMs);
  const roleTone = roleTones[model.roleTone];
  const countdownSeconds = countdownValue === null ? null : Math.ceil(countdownValue / 1_000);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{model.title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: 999,
                background: roleTone.background,
                border: `1px solid ${roleTone.border}`,
                color: roleTone.color
              }}
            >
              {model.roleLabel}
            </span>
            {model.statusLabel ? (
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {model.statusLabel}
              </span>
            ) : null}
          </div>
          {model.subtitle ? (
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.88rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {model.subtitle}
            </span>
          ) : null}
        </div>
        {model.timer ? (
          <TimerRing remainingMs={timerValue} durationMs={model.timer.durationMs} />
        ) : null}
      </header>

      {countdownSeconds !== null && countdownSeconds > 0 ? (
        <div
          style={{
            display: "grid",
            placeItems: "center",
            padding: "10px 0",
            borderRadius: "var(--radius-lg)",
            background: "rgba(15, 23, 42, 0.55)",
            border: "1px dashed var(--panel-border)"
          }}
        >
          <strong style={{ fontSize: "2.6rem", lineHeight: 1, color: "var(--accent)" }}>
            {countdownSeconds}
          </strong>
        </div>
      ) : null}

      {model.card ? (
        <section
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "linear-gradient(165deg, #f8fafc 0%, #e2e8f0 100%)",
            color: "#0f172a",
            padding: "16px 16px 14px",
            boxShadow: "0 12px 30px rgba(2, 6, 23, 0.45)"
          }}
        >
          {model.card.tag ? (
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#64748b"
              }}
            >
              {model.card.tag}
            </span>
          ) : null}
          <div
            style={{
              fontSize: "clamp(1.7rem, 8vw, 2.3rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: "4px 0 12px",
              overflowWrap: "anywhere"
            }}
          >
            {model.card.term}
          </div>
          <div style={{ height: 1, background: "rgba(15, 23, 42, 0.14)", marginBottom: 10 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {model.card.forbidden.map((word) => (
              <span
                key={word}
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "rgba(220, 38, 38, 0.12)",
                  border: "1px solid rgba(220, 38, 38, 0.35)",
                  color: "#b91c1c",
                  textDecoration: "line-through"
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </section>
      ) : model.hiddenCardHint ? (
        <section
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--panel-border)",
            background:
              "repeating-linear-gradient(135deg, rgba(30,41,59,0.75) 0 10px, rgba(15,23,42,0.75) 10px 20px)",
            padding: "22px 16px",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            minHeight: 96,
            color: "var(--text-muted)"
          }}
        >
          {model.hiddenCardHint}
        </section>
      ) : null}

      {model.helperText ? (
        <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.45, fontSize: "0.92rem" }}>
          {model.helperText}
        </p>
      ) : null}

      {model.ready ? <ReadyPanel ready={model.ready} /> : null}

      {model.actions?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {model.actions.map((action) => (
            <ActionButton key={action.id} action={action} disabled={model.disabled} />
          ))}
        </div>
      ) : null}

      {model.targets?.length ? (
        <section style={{ display: "grid", gap: 8 }}>
          {model.targetsTitle ? (
            <strong style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {model.targetsTitle}
            </strong>
          ) : null}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8
            }}
          >
            {model.targets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={target.onSelect}
                disabled={model.disabled || target.disabled}
                style={{
                  minHeight: 54,
                  border: "1px solid rgba(74, 222, 128, 0.45)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(22, 101, 52, 0.28)",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  fontSize: "0.98rem",
                  padding: "8px 10px",
                  opacity: model.disabled || target.disabled ? 0.42 : 1,
                  touchAction: "manipulation"
                }}
              >
                {target.name}
                {target.hint ? (
                  <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {target.hint}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {model.scoreRows?.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {model.scoreRows.map((row) => (
            <div
              key={row.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                background: row.highlighted
                  ? "rgba(59, 130, 246, 0.16)"
                  : "rgba(15, 23, 42, 0.52)",
                border: `1px solid ${row.highlighted ? "rgba(96, 165, 250, 0.45)" : "transparent"}`,
                borderLeft: `3px solid ${row.accentColor ?? "rgba(148, 163, 184, 0.35)"}`,
                borderRadius: "var(--radius-md)",
                padding: "9px 12px"
              }}
            >
              <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.label}
              </span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {model.stats?.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 8 }}>
          {model.stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(15, 23, 42, 0.52)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                display: "grid",
                gap: 2
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{stat.label}</span>
              <strong style={{ color: stat.highlighted ? "var(--accent)" : undefined }}>{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {model.feed?.length ? (
        <section style={{ display: "grid", gap: 5 }}>
          {model.feedTitle ? (
            <strong style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{model.feedTitle}</strong>
          ) : null}
          {model.feed.map((entry) => (
            <span
              key={entry.id}
              style={{
                fontSize: "0.85rem",
                color:
                  entry.tone === "positive"
                    ? "#86efac"
                    : entry.tone === "danger"
                      ? "#fca5a5"
                      : "var(--text-muted)"
              }}
            >
              {entry.text}
            </span>
          ))}
        </section>
      ) : null}
    </div>
  );
}
