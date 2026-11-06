import type { Site } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Check, Code2, Globe2, Loader2 } from "lucide-react";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { api } from "@/lib/api";
export function SiteSettings({
  site,
  onSaved,
  newSite = false,
}: {
  site?: Site;
  onSaved: (site: Site) => void | Promise<void>;
  newSite?: boolean;
}) {
  const [name, setName] = useState(site?.name || ""),
    [domains, setDomains] = useState(site?.domains.join(", ") || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [heartbeat, setHeartbeat] = useState(false),
    [links, setLinks] = useState(false),
    [performance, setPerformance] = useState(true),
    [query, setQuery] = useState(false),
    [hash, setHash] = useState(false);
  const src = `${location.origin}/script.js`;
  const embed = `<script>\n(() => {\n  const load = () => {\n    const s = document.createElement('script');\n    s.src = ${JSON.stringify(src)};\n    s.async = true;\n    s.dataset.siteId = ${JSON.stringify(site?.id || "YOUR_SITE_ID")};\n    s.dataset.domains = ${JSON.stringify(site?.domains.join(",") || domains)};\n    s.dataset.heartbeat = '${heartbeat}';\n    s.dataset.performance = '${performance}';\n    s.dataset.links = '${links}';${query ? "\n    s.dataset.linkQuery = 'true';" : ""}${hash ? "\n    s.dataset.linkHash = 'true';" : ""}\n    document.head.appendChild(s);\n  };\n  if (document.readyState === 'complete') setTimeout(load, 0);\n  else window.addEventListener('load', load, { once: true });\n})();\n<\/script>`;
  return (
    <div className="settings-grid">
      <Card className="panel setting-panel">
        <div className="panel-heading">
          <div>
            <h2>{newSite ? "Your First Website" : "Website Details"}</h2>
            <span className="subtle">
              Only your configured hostnames can send data.
            </span>
          </div>
          <Globe2 size={18} />
        </div>
        <form
          className="site-details-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              const result = await api<Site>("/api/sites", {
                id: site?.id,
                name,
                domains: domains.split(/[,\s]+/).filter(Boolean),
              });
              await onSaved(result);
              setSaved(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Website Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="My Website"
            />
          </label>
          <label>
            Allowed Hostnames
            <Input
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              required
              placeholder="abhi.now, www.abhi.now"
            />
            <span className="subtle">
              Comma-separated, without https:// or a path. Ports are supported
              for development.
            </span>
          </label>
          {site && (
            <label>
              Website ID
              <div className="copy-field">
                <code>{site.id}</code>
                <CopyButton value={site.id} />
              </div>
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            {saved && (
              <span className="success">
                <Check size={14} />
                Saved
              </span>
            )}
            <Button type="submit" disabled={busy} variant="default">
              {busy ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Check size={15} />
              )}{" "}
              {site ? "Save Changes" : "Add Website"}
            </Button>
          </div>
        </form>
      </Card>
      {site && (
        <>
          <Card className="panel setting-panel">
            <div className="panel-heading">
              <div>
                <h2>Privacy</h2>
              </div>
            </div>
            <div className="privacy-copy">
              <ul>
                <li>No IP storage, fingerprinting, or retry queue.</li>
                <li>
                  A random UUID stays in each visitor’s browser. Clearing
                  browser storage creates a new identity.
                </li>
                <li>
                  Detailed history and statistics are kept for 400 days by
                  default. Retention is configured on your server.
                </li>
              </ul>
              <h3>Exclude Your Own Visits</h3>
              <p>
                Run this on your <strong>website’s origin</strong> in the
                browser console:
              </p>
              <div className="copy-field">
                <code>localStorage.setItem('annu.disabled', 'true')</code>
                <CopyButton value="localStorage.setItem('annu.disabled', 'true')" />
              </div>
              <p className="subtle">
                Reload the website afterwards. Remove the key to track this
                browser again.
              </p>
            </div>
          </Card>
          <Card className="panel setting-panel embed-panel">
            <div className="panel-heading">
              <div>
                <h2>Tracking Script</h2>
                <span className="subtle">
                  Paste this snippet once into your shared site layout to start
                  tracking. It loads the tracker automatically after page load.
                </span>
              </div>
              <Code2 size={19} />
            </div>
            <div className="tracking-options">
              {[
                {
                  label: "25-Second Heartbeats",
                  value: heartbeat,
                  set: setHeartbeat,
                },
                {
                  label: "Web Vitals",
                  value: performance,
                  set: setPerformance,
                },
                { label: "All Outgoing Links", value: links, set: setLinks },
                {
                  label: "Keep Link Query Parameters",
                  value: query,
                  set: setQuery,
                },
                { label: "Keep Link Fragments", value: hash, set: setHash },
              ].map((option) => (
                <label className="checkbox" key={option.label}>
                  <Checkbox
                    checked={option.value}
                    onCheckedChange={(checked) => option.set(checked)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="tracking-code">
              <div className="code-header">
                <span>
                  For Astro, add <code>is:inline</code> to the opening script
                  tag
                </span>
                <CopyButton value={embed} />
              </div>
              <pre>
                <code>{embed}</code>
              </pre>
            </div>
            <div className="panel-note">
              Optional outgoing link tracking: mark individual links with{" "}
              <code>data-annu-link</code> or enable “All Outgoing Links” above
              before copying the snippet. Downloads and mailto links are
              included. Astro ClientRouter is supported.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
