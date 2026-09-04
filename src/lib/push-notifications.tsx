import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";

const VAPID_PUBLIC_KEY =
  "BAKsD-xbqfbmPYKdTVBE8X5ffPMTQSO7cKaB3IF5PYf1dMmBD3Fg4c0iXd6ZWYHSFSB-xqwVzG0Tfr5OFFxfe5c";

type PushCtx = {
  supported: boolean;
  ready: boolean;
  enabled: boolean;
  busy: boolean;
  permission: NotificationPermission | "unsupported";
  unsupportedReason: string | null;
  toggle: (next: boolean) => Promise<void>;
};

const Ctx = createContext<PushCtx | null>(null);

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [supported, setSupported] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Register the service worker + detect capabilities.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const canPush =
      "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";

    if (!canPush) {
      setSupported(false);
      setPermission("unsupported");
      setUnsupportedReason(
        isStandalone()
          ? "Ton navigateur ne prend pas en charge les notifications push."
          : "Sur iPhone, ajoute d'abord XP Wars à ton écran d'accueil pour activer les rappels."
      );
      setReady(true);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!existing);
      } catch (err) {
        console.error("[push] service worker registration failed", err);
        if (!cancelled) {
          setSupported(false);
          setUnsupportedReason("Le service de notifications n'a pas pu démarrer sur cet appareil.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId) {
      toast("Connecte-toi pour activer les rappels");
      return;
    }

    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") {
      toast("Notifications refusées", {
        description: "Tu peux les réactiver dans les réglages de ton navigateur.",
      });
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }));

    const p256dh = arrayBufferToBase64Url(subscription.getKey("p256dh"));
    const authKey = arrayBufferToBase64Url(subscription.getKey("auth"));

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;

    setEnabled(true);
    toast.success("Rappels activés", { description: "Tu recevras un rappel à 19h si aucune quête n'est validée." });
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe();
    }
    if (userId) {
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    }

    setEnabled(false);
    toast("Rappels désactivés");
  }, [userId]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (busy || !supported) return;
      setBusy(true);
      try {
        if (next) await subscribe();
        else await unsubscribe();
      } catch (err) {
        console.error("[push] toggle failed", err);
        toast("Impossible de modifier les rappels", {
          description: "Réessaie dans un instant.",
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, supported, subscribe, unsubscribe]
  );

  const value = useMemo<PushCtx>(
    () => ({ supported, ready, enabled, busy, permission, unsupportedReason, toggle }),
    [supported, ready, enabled, busy, permission, unsupportedReason, toggle]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePushNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePushNotifications must be used within PushNotificationsProvider");
  return ctx;
}
