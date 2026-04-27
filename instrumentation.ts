import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PostHogSpanProcessor } from "@posthog/ai/otel";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        "service.name": "standout",
      }),
      spanProcessors: [
        new PostHogSpanProcessor({
          apiKey: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!,
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        }),
      ],
    });
    sdk.start();
  }
}
