import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "gocart-ecommerce",
  signingKey: process.env.INGEST_SIGNING_KEY,
});