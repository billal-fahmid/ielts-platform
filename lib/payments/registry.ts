import { manualProvider } from "./providers/manual";
import { signedWebhookProvider } from "./providers/signed";
import { createSslCommerzProvider } from "./providers/sslcommerz";
import type { PaymentMethod, PaymentProvider } from "./types";

/** Every provider the platform knows. Add a new gateway here and it is available everywhere. */
let providers: PaymentProvider[] = [manualProvider, createSslCommerzProvider(), signedWebhookProvider];

/** For tests: replace the providers. Call with no argument to restore the defaults. */
export function setProvidersForTests(list?: PaymentProvider[]) {
  providers = list ?? [manualProvider, createSslCommerzProvider(), signedWebhookProvider];
}

export const getProviders = () => providers;
export const getProvider = (code: string) => providers.find((p) => p.code === code);

/** The provider that takes a given method, if it is configured. */
export function providerForMethod(method: PaymentMethod): PaymentProvider | undefined {
  return providers.find((p) => p.methods.includes(method) && p.isConfigured());
}
