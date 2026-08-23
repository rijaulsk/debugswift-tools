/* What actually gets encoded, per kind of code.
 *
 * Separated from the component because these are formats with rules, not string
 * concatenation, and getting one subtly wrong produces a QR that scans
 * perfectly and does the wrong thing — which is the worst failure mode this
 * tool has. A code that doesn't scan gets noticed. A code that joins the wrong
 * network doesn't.
 *
 * THE ESCAPING IS THE POINT, and it is where most free generators are broken.
 * A WiFi password containing a semicolon, a comma, a colon, a backslash or a
 * quote will silently truncate or corrupt the payload unless each is escaped —
 * and those are exactly the characters a decent router password contains. The
 * café that prints a QR nobody can join, and never finds out why, is the
 * failure this file exists to prevent.
 */

export type Kind = "link" | "phone" | "whatsapp" | "wifi" | "vcard" | "email" | "sms" | "text";

export type Values = Record<string, string>;

/** Escape the five characters the WiFi format reserves. Order matters: the
 *  backslash must be doubled FIRST, or it would escape the escapes added after
 *  it. */
function escapeWifi(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:")
    .replace(/"/g, '\\"');
}

/** vCard escapes a smaller set, and newlines have to go — a literal newline
 *  inside a property value ends the property. */
function escapeVcard(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, " ");
}

const digits = (s: string) => s.replace(/\D/g, "");
const dialable = (s: string) => s.replace(/[^\d+]/g, "");

export function payloadFor(kind: Kind, values: Values): string {
  const v = (key: string) => (values[key] ?? "").trim();

  switch (kind) {
    case "phone":
      return v("value") ? `tel:${dialable(v("value"))}` : "";

    case "whatsapp":
      return v("value") ? `https://wa.me/${digits(v("value"))}` : "";

    case "link": {
      const value = v("value");
      if (!value) return "";
      /* A scheme-less address is the commonest input and the commonest cause of
       * a code that does nothing when scanned — many scanners will not treat
       * bare text as a URL. */
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) ? value : `https://${value}`;
    }

    case "wifi": {
      const ssid = v("ssid");
      if (!ssid) return "";
      const password = v("password");
      /* nopass, not WPA-with-an-empty-password: an open network declared as WPA
       * makes phones prompt for a password that does not exist. */
      const security = password ? v("security") || "WPA" : "nopass";
      const hidden = v("hidden") === "yes";
      const parts = [
        `WIFI:T:${security}`,
        `S:${escapeWifi(ssid)}`,
        password ? `P:${escapeWifi(password)}` : "",
        hidden ? "H:true" : "",
      ].filter(Boolean);
      /* The format ends with TWO semicolons — one closing the last field, one
       * closing the record. Scanners are inconsistent about a missing one. */
      return `${parts.join(";")};;`;
    }

    case "vcard": {
      const first = v("first");
      const last = v("last");
      if (!first && !last) return "";
      const full = [first, last].filter(Boolean).join(" ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
        `FN:${escapeVcard(full)}`,
        v("org") ? `ORG:${escapeVcard(v("org"))}` : "",
        v("title") ? `TITLE:${escapeVcard(v("title"))}` : "",
        v("phone") ? `TEL;TYPE=CELL:${dialable(v("phone"))}` : "",
        v("email") ? `EMAIL:${escapeVcard(v("email"))}` : "",
        v("url") ? `URL:${escapeVcard(v("url"))}` : "",
        "END:VCARD",
      ].filter(Boolean);
      /* CRLF, per the spec. Some Android scanners drop a vCard with bare LF. */
      return lines.join("\r\n");
    }

    case "email": {
      const to = v("to");
      if (!to) return "";
      const query = new URLSearchParams();
      if (v("subject")) query.set("subject", v("subject"));
      if (v("body")) query.set("body", v("body"));
      const q = query.toString();
      return `mailto:${to}${q ? `?${q}` : ""}`;
    }

    case "sms": {
      const number = v("number");
      if (!number) return "";
      /* SMSTO: rather than sms: — it is the form both Android and iOS have
       * handled consistently for years, where sms:?body= support varies. */
      const message = v("message");
      return message
        ? `SMSTO:${dialable(number)}:${message}`
        : `SMSTO:${dialable(number)}`;
    }

    case "text":
    default:
      return v("value");
  }
}

/** A human-readable summary of what a scanner will DO, shown under the code.
 *  The raw payload is also shown, but "WIFI:T:WPA;S:Café;;" does not tell
 *  somebody whether they got it right. */
export function actionFor(kind: Kind, values: Values): string | null {
  const v = (key: string) => (values[key] ?? "").trim();
  switch (kind) {
    case "wifi":
      return v("ssid")
        ? `Joins the network “${v("ssid")}”${v("password") ? "" : " (open, no password)"}.`
        : null;
    case "vcard":
      return v("first") || v("last")
        ? `Saves a contact card for ${[v("first"), v("last")].filter(Boolean).join(" ")}.`
        : null;
    case "email":
      return v("to") ? `Starts an email to ${v("to")}.` : null;
    case "sms":
      return v("number") ? `Starts a text message to ${v("number")}.` : null;
    case "phone":
      return v("value") ? `Starts a call to ${v("value")}.` : null;
    case "whatsapp":
      return v("value") ? "Opens a WhatsApp chat with you." : null;
    default:
      return null;
  }
}
