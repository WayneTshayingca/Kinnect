// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a56b21f0b896ed8745b2c91ef7c6da88@o4510878744969216.ingest.us.sentry.io/4510878748835840",

  // Drop traces for static assets to reduce noise
  tracesSampler(samplingContext) {
    const url = samplingContext.transactionContext?.name ?? ''
    if (
      url.includes('_next/static') ||
      url.includes('_next/image') ||
      /\.(ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|css|js|map)$/.test(url)
    ) {
      return 0
    }
    return 1
  },

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
