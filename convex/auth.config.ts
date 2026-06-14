/** Convex Auth provider config (plan §Auth & Sync — Google only). */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
