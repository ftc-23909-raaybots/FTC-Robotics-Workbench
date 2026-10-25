import { Check, Palette, PlugZap, Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { APP_THEMES } from "./themes";

interface SettingsPageProps {
  themeId: string;
  onThemeChange: (themeId: string) => void;
  robotAddress: string;
  onEditConnection: () => void;
}

export default function SettingsPage({
  themeId,
  onThemeChange,
  robotAddress,
  onEditConnection,
}: SettingsPageProps) {
  const [query, setQuery] = useState("");
  const filteredThemes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return APP_THEMES.filter((theme) =>
      !normalizedQuery ||
      `${theme.name} ${theme.description}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div className="settings-page">
      <section className="settings-page-intro" aria-labelledby="settings-page-title">
        <div className="settings-page-intro-icon"><Settings2 size={22} /></div>
        <div>
          <span className="eyebrow">PERSONALIZE YOUR WORKSPACE</span>
          <h2 id="settings-page-title">Application settings</h2>
          <p>Choose how the robot console looks. Your theme is saved on this computer.</p>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="appearance-title">
        <header className="settings-section-heading">
          <div className="settings-section-icon"><Palette size={19} /></div>
          <div>
            <span className="eyebrow">DISPLAY</span>
            <h3 id="appearance-title">Appearance and themes</h3>
            <p>Select a visual theme. It applies throughout the app and takes effect immediately.</p>
          </div>
          <span className="settings-selection-count">{APP_THEMES.length} THEMES</span>
        </header>
        <label className="theme-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Filter themes</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a theme"
          />
        </label>
        {filteredThemes.length ? (
          <div className="theme-grid" aria-label="Available themes">
            {filteredThemes.map((theme) => {
              const selected = theme.id === themeId;
              return (
                <button
                  key={theme.id}
                  className={`theme-option ${selected ? "theme-option-selected" : ""}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onThemeChange(theme.id)}
                >
                  <span
                    className="theme-swatch"
                    aria-hidden="true"
                    style={{
                      backgroundColor: theme.colors[0],
                      color: theme.colors[1],
                      borderColor: theme.colors[3],
                    }}
                  >
                    <span className="theme-swatch-top" />
                    <span className="theme-swatch-sidebar" />
                    <span
                      className="theme-swatch-surface"
                      style={{ backgroundColor: theme.colors[3] }}
                    />
                    <span
                      className="theme-swatch-accent"
                      style={{ backgroundColor: theme.colors[2] }}
                    />
                  </span>
                  <span className="theme-option-copy">
                    <span className="theme-option-title">{theme.name}</span>
                    {selected && <span className="theme-selected-label"><Check size={12} /> SELECTED</span>}
                    <span className="theme-option-description">{theme.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="theme-empty-state" role="status">No themes match “{query}”.</p>
        )}
      </section>

      <section className="settings-section connection-settings-section" aria-labelledby="connection-settings-title">
        <header className="settings-section-heading">
          <div className="settings-section-icon"><PlugZap size={19} /></div>
          <div>
            <span className="eyebrow">ROBOT API</span>
            <h3 id="connection-settings-title">Connection</h3>
            <p>Manage the telemetry API address used for this robot profile.</p>
          </div>
        </header>
        <div className="settings-connection-row">
          <div>
            <span className="settings-value-label">ACTIVE TELEMETRY ADDRESS</span>
            <strong>{robotAddress}</strong>
          </div>
          <button className="hard-button button-white" type="button" onClick={onEditConnection}>
            <PlugZap size={15} /> EDIT CONNECTION
          </button>
        </div>
        <p className="settings-footnote">
          Connection addresses are saved with the active robot profile. Theme preferences are saved separately on this computer.
        </p>
      </section>
    </div>
  );
}
