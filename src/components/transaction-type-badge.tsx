import { Badge } from "@/components/ui/badge";
import type { TransactionType } from "@/domain/transaction/transaction.types";

export function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<
    TransactionType,
    { label: string; variant: "default" | "destructive" | "secondary" }
  > = {
    BUY: { label: "Buy", variant: "default" },
    SELL: { label: "Sell", variant: "destructive" },
    DIVIDEND: { label: "Dividend", variant: "secondary" },
  }
  const config = variants[type as TransactionType] ?? {
    label: type,
    variant: "secondary" as const,
  }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
