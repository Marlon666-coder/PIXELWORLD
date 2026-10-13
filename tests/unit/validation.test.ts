import { describe, expect, it } from "vitest";
import {
  competitionFormSchema,
  competitionPayloadSchema,
  posterUploadRequestSchema,
  toCompetitionWrite,
} from "@/lib/validation/competition";
import { loginSchema } from "@/lib/validation/login";

const validForm = {
  title: "Global Pixel Hackathon",
  organizer: "Pixel Guild",
  category: "hackathon",
  description: "A 48-hour build sprint.",
  registrationDeadline: "2026-10-20T23:59",
  eventDate: "",
  registrationUrl: "https://example.com/register",
  status: "published",
} as const;

describe("competitionFormSchema", () => {
  it("accepts a valid form", () => {
    expect(competitionFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("trims and enforces title length", () => {
    expect(competitionFormSchema.safeParse({ ...validForm, title: "ab" }).success).toBe(false);
    const parsed = competitionFormSchema.safeParse({ ...validForm, title: "  Valid Title  " });
    expect(parsed.success && parsed.data.title).toBe("Valid Title");
  });

  it("rejects unknown categories and statuses", () => {
    expect(competitionFormSchema.safeParse({ ...validForm, category: "cooking" }).success).toBe(false);
    expect(competitionFormSchema.safeParse({ ...validForm, status: "archived" }).success).toBe(false);
  });

  it("rejects unsafe registration URLs but allows empty", () => {
    expect(competitionFormSchema.safeParse({ ...validForm, registrationUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(competitionFormSchema.safeParse({ ...validForm, registrationUrl: "" }).success).toBe(true);
  });

  it("rejects malformed datetime strings", () => {
    expect(competitionFormSchema.safeParse({ ...validForm, registrationDeadline: "20/10/2026" }).success).toBe(false);
  });
});

describe("competitionPayloadSchema", () => {
  it("accepts a valid poster path or null", () => {
    const path = "posters/4f1a2b3c-1d2e-4f3a-8b9c-0a1b2c3d4e5f.webp";
    expect(competitionPayloadSchema.safeParse({ ...validForm, posterPath: path }).success).toBe(true);
    expect(competitionPayloadSchema.safeParse({ ...validForm, posterPath: null }).success).toBe(true);
  });

  it("rejects a forged/path-traversal poster path", () => {
    expect(competitionPayloadSchema.safeParse({ ...validForm, posterPath: "posters/../secret.png" }).success).toBe(false);
    expect(competitionPayloadSchema.safeParse({ ...validForm, posterPath: "evil/x.png" }).success).toBe(false);
  });
});

describe("toCompetitionWrite", () => {
  it("converts dates using the given time zone and nulls empties", () => {
    const result = toCompetitionWrite({ ...validForm, eventDate: "", description: "" }, "Asia/Jakarta");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.registration_deadline).toBe("2026-10-20T16:59:00.000Z");
      expect(result.data.event_date).toBeNull();
      expect(result.data.description).toBeNull();
      expect(result.data.registration_url).toBe("https://example.com/register");
    }
  });

  it("reports a field error for impossible dates", () => {
    const result = toCompetitionWrite({ ...validForm, registrationDeadline: "2026-02-30T10:00" }, "UTC");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.registrationDeadline).toBeDefined();
  });
});

describe("posterUploadRequestSchema", () => {
  it("accepts supported content types with a positive size", () => {
    expect(posterUploadRequestSchema.safeParse({ contentType: "image/png", size: 1024 }).success).toBe(true);
  });
  it("rejects unsupported types and non-positive sizes", () => {
    expect(posterUploadRequestSchema.safeParse({ contentType: "image/gif", size: 1024 }).success).toBe(false);
    expect(posterUploadRequestSchema.safeParse({ contentType: "image/png", size: 0 }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a valid email and a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "secret" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "nope", password: "secret" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "admin@example.com", password: "" }).success).toBe(false);
  });
});
