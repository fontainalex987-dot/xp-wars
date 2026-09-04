import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

export const Route = createFileRoute("/api/public/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedSecret = process.env["PUSH_DISPATCH_SECRET"];
        const providedSecret = request.headers.get("x-push-secret");
        if (!expectedSecret || providedSecret !== expectedSecret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let payload: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          title?: string;
          body?: string;
        };
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { endpoint, p256dh, auth, title, body } = payload;
        if (!endpoint || !p256dh || !auth) {
          return new Response(JSON.stringify({ error: "Missing subscription fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const subscription: PushSubscription = {
          endpoint,
          expirationTime: null,
          keys: { p256dh, auth },
        };

        try {
          const pushPayload = await buildPushPayload(
            {
              data: {
                title: title ?? "XP Wars",
                body: body ?? "Une petite quête t'attend.",
              },
            },
            subscription,
            {
              subject: process.env["VAPID_SUBJECT"],
              publicKey: process.env["VAPID_PUBLIC_KEY"],
              privateKey: process.env["VAPID_PRIVATE_KEY"],
            },
          );

          const res = await fetch(endpoint, {
            method: "POST",
            headers: pushPayload.headers,
            body: pushPayload.body,
          });

          if (res.status === 404 || res.status === 410) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
            return Response.json({ ok: true, removed: true });
          }

          if (!res.ok) {
            const text = await res.text();
            console.error("[send-push] provider error", res.status, text);
            return new Response(JSON.stringify({ error: "Push provider error", status: res.status }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          return Response.json({ ok: true });
        } catch (err) {
          console.error("[send-push] failed", err);
          return new Response(JSON.stringify({ error: "Push failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
