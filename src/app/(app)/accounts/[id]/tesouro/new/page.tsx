import { createTesouroTransactionAction } from "@/actions/tesouro.actions";
import { SetHeader } from "@/components/header-context";
import { Page } from "@/components/page";
import { TesouroBondTransactionForm } from "@/components/tesouro-transaction-form";
import { findAccountById } from "@/repositories/account.repository";
import { getDefaultUserId } from "@/repositories/user.repository";
import { notFound } from "next/navigation";

export default async function NewTesouroBondTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getDefaultUserId();
  const account = await findAccountById(id, userId);

  if (!account) notFound();

  const action = createTesouroTransactionAction.bind(null, id);

  return (
    <Page>
      <SetHeader back={`/accounts/${id}`}>
        <div>
          <h1 className="text-base font-medium">New Bond Transaction</h1>
          <p className="text-xs text-muted-foreground">{account.name}</p>
        </div>
      </SetHeader>
      <TesouroBondTransactionForm
        action={action}
        submitLabel="Add Bond Transaction"
      />
    </Page>
  );
}
