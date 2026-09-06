"use client";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Palette, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes: { id: Theme; label: string; color: string }[] = [
    { id: "dark", label: "Dark Navy", color: "#38bdf8" },
    { id: "lime", label: "Petrol Lime", color: "#E6FF2B" },
    { id: "meta", label: "Meta Blue", color: "#0082FB" },
    { id: "light", label: "Light Slate", color: "#2563eb" },
  ];

  const currentLabel = themes.find((t) => t.id === theme)?.label || "Theme";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--btn-ghost-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--heading)] hover:opacity-90 transition-colors shadow-sm"
        title="Change Theme Palette"
      >
        <Palette size={15} className="text-[var(--btn-primary-bg)]" />
        <span>{currentLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[var(--line)] bg-[var(--header-bg)] p-1.5 shadow-2xl z-50 text-xs">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-1">
            Select Theme
          </div>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                theme === t.id
                  ? "bg-[var(--btn-primary-bg)]/15 text-[var(--btn-primary-bg)] font-bold"
                  : "text-[var(--heading)] hover:bg-[var(--nav-hover-bg)] font-medium"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-black/20"
                  style={{ backgroundColor: t.color }}
                />
                <span>{t.label}</span>
              </div>
              {theme === t.id && <Check size={14} className="text-[var(--btn-primary-bg)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

