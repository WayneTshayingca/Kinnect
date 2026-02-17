// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { beforeSend, beforeSendTransaction, denyUrls } from "./sentry-utils";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // --- Privacy (POPIA) ---
  sendDefaultPii: false,
  beforeSend,
  beforeSendTransaction,
  denyUrls,

  // --- Performance ---
  // 10% of traces in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // --- Session Replay ---
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 0.5,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // --- Logs ---
  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
