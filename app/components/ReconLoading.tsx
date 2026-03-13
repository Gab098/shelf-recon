import { BlockStack, InlineStack, Spinner, Text } from "@shopify/polaris";
import { RaccoonReconLogo } from "~/components/RaccoonReconLogo";

export function ReconLoading({
  label = "🦝 Recon sta frugando tra i dati...",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <div className="sr-panel p-6">
      <InlineStack gap="400" align="center" blockAlign="center">
        <div className="animate-glowPulse">
          <RaccoonReconLogo size={44} />
        </div>
        <BlockStack gap="100">
          <Text as="p" variant="bodyMd">
            {label}
          </Text>
          {detail ? (
            <Text as="p" variant="bodySm" tone="subdued">
              {detail}
            </Text>
          ) : null}
        </BlockStack>
        <Spinner accessibilityLabel="Loading" size="small" />
      </InlineStack>
    </div>
  );
}

