interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  EMAIL: {
    send(message: {
      to: string;
      from: string;
      subject: string;
      text: string;
      replyTo?: string;
    }): Promise<{ messageId: string }>;
  };
  TURNSTILE_SECRET_KEY: string;
  CONTACT_RECIPIENT: string;
  CONTACT_SENDER: string;
  CONTACT_RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}

interface TurnstileResult {
  success: boolean;
  hostname?: string;
}

const reply = (message: string, status: number) =>
  Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

const MAX_BODY_BYTES = 20_000;

async function readLimitedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("INVALID_UTF8");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/api/contact") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return reply("Method not allowed.", 405);
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

    const { success } = await env.CONTACT_RATE_LIMITER.limit({
      key: `contact:${ip}`,
    });

    if (!success) {
      return reply("Too many requests. Please try again later.", 429);
    }

    if (request.headers.get("origin") !== url.origin) {
      return reply("Invalid request origin.", 403);
    }

    const contentType = request.headers.get("content-type");
    const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();

    if (mediaType !== "application/x-www-form-urlencoded") {
      return reply("Unsupported content type.", 415);
    }

    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return reply("Message is too large.", 413);
    }

    try {
      const rawBody = await readLimitedBody(request);

      if (rawBody === null) {
        return reply("Message is too large.", 413);
      }

      const form = new URLSearchParams(rawBody);

      const allowedFields = new Set([
        "name",
        "email",
        "subject",
        "message",
        "website",
        "cf-turnstile-response",
      ]);

      for (const [key] of form) {
        if (!allowedFields.has(key) || form.getAll(key).length !== 1) {
          return reply("Invalid form data.", 400);
        }
      }

      const name = (form.get("name") ?? "").trim();
      const email = (form.get("email") ?? "").trim();
      const subject = (form.get("subject") ?? "").trim();
      const message = (form.get("message") ?? "").trim();
      const website = form.get("website") ?? "";
      const token = form.get("cf-turnstile-response") ?? "";

      if (website) {
        return reply("Message received.", 200);
      }

      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const validHeaders = !/[\r\n\x00-\x1f\x7f]/.test(subject + email);

      if (
        name.length < 2 ||
        name.length > 100 ||
        !validEmail ||
        !validHeaders ||
        email.length > 254 ||
        subject.length > 150 ||
        message.length < 10 ||
        message.length > 5000
      ) {
        return reply("Please check your contact details and message.", 400);
      }

      if (!token || token.length > 2048) {
        return reply("Please complete the spam verification.", 400);
      }

      const verification = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET_KEY,
            response: token,
            remoteip: request.headers.get("CF-Connecting-IP") ?? undefined,
          }),
        },
      );

      if (!verification.ok) {
        return reply("Verification is temporarily unavailable.", 503);
      }

      const result = (await verification.json()) as TurnstileResult;

      if (!result.success || result.hostname !== url.hostname) {
        return reply("Spam verification failed. Please try again.", 400);
      }

      await env.EMAIL.send({
        to: env.CONTACT_RECIPIENT,
        from: env.CONTACT_SENDER,
        replyTo: email,
        subject: `Portfolio contact: ${subject || "New message"}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Subject: ${subject || "Not specified"}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      });

      return reply("Your message has been sent successfully.", 200);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_UTF8") {
        return reply("Invalid request encoding.", 400);
      }

      console.error("Contact submission failed:", error);
      return reply("Unable to send your message right now.", 500);
    }
  },
};
