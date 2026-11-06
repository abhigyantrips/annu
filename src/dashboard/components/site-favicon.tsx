import { useState } from "react";

export function SiteFavicon({
  domain,
  name,
}: {
  domain?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  let hostname = "";
  try {
    if (domain)
      hostname = new URL(domain.includes("://") ? domain : `https://${domain}`)
        .hostname;
  } catch {
    /* Missing or invalid hostnames use the site's initial. */
  }
  return (
    <span className="site-favicon" aria-hidden="true">
      {hostname && !failed ? (
        <img
          src={`https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`}
          width={16}
          height={16}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        name[0]?.toUpperCase() || "+"
      )}
    </span>
  );
}
