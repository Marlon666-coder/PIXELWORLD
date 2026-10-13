import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).max(254, { error: "Email is too long." }),
  password: z
    .string()
    .min(1, { error: "Enter your password." })
    .max(256, { error: "Password is too long." }),
});

export type LoginValues = z.infer<typeof loginSchema>;
