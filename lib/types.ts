/* Shared shapes. Deliberately tiny — this repo's real domain types live next to
 * the tool that owns them (see lib/audit/types.ts), and only what more than one
 * tool needs belongs here. */

export type FaqItem = { question: string; answer: string };
