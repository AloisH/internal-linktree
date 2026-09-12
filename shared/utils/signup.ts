import { z } from "zod";

// Self sign-up is open only to the organisation's addresses: the admin sets
// NUXT_PUBLIC_SIGNUP_EMAIL_DOMAIN (e.g. "clinique.fr"), the form and the
// server both check the address ends with it. Empty = no self sign-up.

/** "@Clinique.fr " → "clinique.fr"; "" when nothing usable is configured. */
export function normalizeEmailDomain(value: string | undefined): string {
  return (value ?? "").trim().replace(/^@/, "").toLowerCase();
}

export function isCompanyEmail(email: string, domain: string): boolean {
  return domain.length > 0 && email.trim().toLowerCase().endsWith(`@${domain}`);
}

export function signupSchema(domain: string) {
  return z.object({
    name: z.string().trim().min(1, "Requis").max(80, "80 caractères maximum"),
    email: z
      .email("Adresse invalide")
      .max(254)
      .refine((e) => isCompanyEmail(e, domain), `Utilisez votre adresse @${domain}`),
    password: z.string().min(12, "12 caractères minimum").max(128, "128 caractères maximum"),
  });
}
export type SignupInput = z.infer<ReturnType<typeof signupSchema>>;
