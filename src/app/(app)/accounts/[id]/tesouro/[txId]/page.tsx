import { updateTesouroTransactionAction } from "@/actions/tesouro.actions";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { SetActions, SetHeader } from "@/components/header-context";
import { Page } from "@/components/page";
import { TesouroBondTransactionForm } from "@/components/tesouro-transaction-form";
import { findAccountById } from "@/repositories/account.repository";
import { findTransactionById } from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";
import { notFound } from "next/navigation";

export default async function EditTesouroBondTransactionPage({
  params,
}: {
  params: Promise<{ id: string; txId: string }>;
}) {
  const { id, txId } = await params;
  const userId = await getDefaultUserId();

  const [account, transaction] = await Promise.all([
    findAccountById(id, userId),
    findTransactionById(txId, id),
  ]);

  if (!account || !transaction) notFound();

  const action = updateTesouroTransactionAction.bind(null, id, txId);

  return (
    <Page>
      <SetHeader back={`/accounts/${id}`}>
        <div>
          <h1 className="text-base font-medium">Edit Bond Transaction</h1>
          <p className="text-xs text-muted-foreground">{account.name}</p>
        </div>
      </SetHeader>
      <SetActions>
        {/* Reuse the same delete button — it dispatches deleteTransaction which is asset-agnostic */}
        <DeleteTransactionButton accountId={id} txId={txId} />
      </SetActions>
      <TesouroBondTransactionForm
        action={action}
        defaultValues={{
          symbol: transaction.symbol,
          type: transaction.type as "BUY" | "SELL",
          date: transaction.date,
          quantity: transaction.quantity,
          unitPrice: transaction.unitPrice,
          fee: transaction.fee,
          notes: transaction.notes,
        }}
        submitLabel="Save Changes"
      />
    </Page>
  );
}
