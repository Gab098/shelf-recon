import { Badge, BlockStack, Button, Card, InlineStack, Text } from "@shopify/polaris";

export function InsightCard({
  title,
  detail,
  badge,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  detail: string;
  badge: { label: string; tone?: "success" | "warning" | "critical" | "info" };
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <Text as="h3" variant="headingMd">
            {title}
          </Text>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </InlineStack>
        <Text as="p" variant="bodyMd" tone="subdued">
          {detail}
        </Text>
        {actionLabel && onAction ? (
          <InlineStack align="end">
            <Button onClick={onAction} disabled={disabled}>
              {actionLabel}
            </Button>
          </InlineStack>
        ) : null}
      </BlockStack>
    </Card>
  );
}

