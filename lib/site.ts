/* Site-wide contact + social constants (redesign brief P0.3/P0.4).
 * One place to swap channels — components never hard-code these. */

export const WHATSAPP_NUMBER = "918585030894"; // wa.me needs country code (+91)

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Deb")}`;

export const CONTACT_EMAIL = "hello@debugswift.com";

/* Web3Forms access key for the diagnosis form. Create/rotate at web3forms.com
 * against hello@debugswift.com.
 *
 * Committed on purpose, and it is NOT a secret. The form posts to Web3Forms
 * straight from the visitor's browser (it has to — Web3Forms sits behind a
 * Cloudflare bot challenge that no server-to-server POST can clear), so the key
 * is readable in the JS bundle no matter how it gets there. Holding it in an
 * env var published exactly the same string while adding a build-time trap:
 * NEXT_PUBLIC_ values are inlined at build, so setting one without redeploying
 * silently changes nothing. All the key authorises is "send a message to the
 * form owner's inbox."
 *
 * If this ever starts attracting spam, rotate it here and lean on Web3Forms'
 * own filtering — do not reach for a server-side proxy, it cannot work. */
export const WEB3FORMS_ACCESS_KEY = "108a61d2-f07c-4d92-869c-048d31eab460";

export const SOCIALS: { name: string; href: string }[] = [
  { name: "X", href: "https://x.com/debugswift" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/debugswift" },
  { name: "Instagram", href: "https://www.instagram.com/debugswift" },
  { name: "Facebook", href: "https://www.facebook.com/debugswift" },
];
