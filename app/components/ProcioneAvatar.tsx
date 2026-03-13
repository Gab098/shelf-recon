import { InlineStack, Text } from "@shopify/polaris";
import { RaccoonReconLogo } from "~/components/RaccoonReconLogo";

export function ProcioneAvatar({
  label = "Recon",
  subtitle,
}: {
  label?: string;
  subtitle?: string;
}) {
  return (
    <InlineStack gap="200" blockAlign="center">
      <div className="animate-glowPulse">
        <RaccoonReconLogo size={36} />
      </div>
      <div>
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {label}
        </Text>
        {subtitle ? (
          <Text as="p" variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        ) : null}
      </div>
    </InlineStack>
  );
}

