import { z } from "zod";

// One schema, validated twice: in the browser by UForm and on the server by
// readValidatedBody. Nuxt auto-imports everything under shared/utils.
export const messageSchema = z.object({
  name: z.string().trim().min(1, "Requis").max(100, "100 caractères maximum"),
  email: z.email("E-mail invalide").max(200, "200 caractères maximum"),
  body: z.string().trim().min(1, "Requis").max(2000, "2000 caractères maximum"),
});

export type MessageInput = z.infer<typeof messageSchema>;
