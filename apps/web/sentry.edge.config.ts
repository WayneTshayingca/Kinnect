// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { beforeSend, beforeSendTransaction } from "./sentry-utils";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // --- Privacy (POPIA) ---
  sendDefaultPii: false,
  beforeSend,
  beforeSendTransaction,

  // --- Performance ---
  // Drop static asset traces, sample 10% in production
  tracesSampler(samplingContext) {
    const url = samplingContext.transactionContext?.name ?? ''
    if (
      url.includes('_next/static') ||
      url.includes('_next/image') ||
      /\.(ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|css|js|map)$/.test(url)
    ) {
      return 0
    }
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  },

  // --- Logs ---
  enableLogs: true,
});
