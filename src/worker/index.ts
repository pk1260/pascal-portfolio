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
}

interface TurnstileResult {
  success: boolean;
  hostname?: string;
}

const reply = (message: string, status: number) =>
  Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/api/contact") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return reply("Method not allowed.", 405);
    }

    if (request.headers.get("origin") !== url.origin) {
      return reply("Invalid request origin.", 403);
    }

    if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
      return reply("Unsupported content type.", 415);
    }

    if (Number(request.headers.get("content-length") ?? 0) > 20000) {
      return reply("Message is too large.", 413);
    }

    try {
      const form = await request.formData();

      const name = String(form.get("name") ?? "").trim();
      const email = String(form.get("email") ?? "").trim();
      const subject = String(form.get("subject") ?? "").trim();
      const message = String(form.get("message") ?? "").trim();
      const website = String(form.get("website") ?? "");
      const token = String(form.get("cf-turnstile-response") ?? "");

      if (website) {
        return reply("Message received.", 200);
      }

      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (
        name.length < 2 ||
        name.length > 100 ||
        !validEmail ||
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
      console.error("Contact submission failed:", error);
      return reply("Unable to send your message right now.", 500);
    }
  },
};
