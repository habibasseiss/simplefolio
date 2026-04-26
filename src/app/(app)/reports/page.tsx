import { getReportsData } from "@/actions/reports.actions";
import { SetActions, SetHeader } from "@/components/header-context";
import { Page } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { YearSelector } from "./year-selector";

export default async function ReportsPage(props: {
  searchParams: Promise<{ year?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getUTCFullYear();
  const baseYear = searchParams.year ? parseInt(searchParams.year) : currentYear - 1;

  // Provide a few recent years
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const data = await getReportsData(baseYear);

  const formatBRL = (val: number) => formatCurrency(val, "BRL");
  const formatUSD = (val: number) => formatCurrency(val, "USD");

  const totalAssetsBrl = data.assets.reduce((sum, a) => sum + a.totalCostBrl, 0);
  const totalTaxesBrl = data.capitalGains.reduce((sum, g) => sum + g.tax15Brl, 0);

  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">Relatório para Declaração de IR</h1>
      </SetHeader>
      <SetActions>
        <YearSelector currentYear={baseYear} availableYears={availableYears} />
      </SetActions>

      <div className="flex flex-col gap-8 pb-12">
        {/* RESUMO POR ATIVO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
              Resumo por Ativo – Bens e Direitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Quantidade Atual</TableHead>
                  <TableHead className="text-right">Custo Total (BRL)</TableHead>
                  <TableHead className="text-right">Custo Médio (BRL)</TableHead>
                  <TableHead className="text-right">Situação Ano Anterior (BRL)</TableHead>
                  <TableHead className="text-right">Variação (BRL)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      Nenhum ativo encontrado para o ano-base.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.assets.map((asset) => (
                    <TableRow key={asset.symbol}>
                      <TableCell className="font-medium">{asset.symbol}</TableCell>
                      <TableCell className="text-right">{asset.quantity.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{formatBRL(asset.totalCostBrl)}</TableCell>
                      <TableCell className="text-right">{formatBRL(asset.avgCostBrl)}</TableCell>
                      <TableCell className="text-right">{formatBRL(asset.prevYearTotalCostBrl)}</TableCell>
                      <TableCell className={`text-right ${asset.variationBrl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {asset.variationBrl > 0 ? "+" : ""}{formatBRL(asset.variationBrl)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {data.assets.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>TOTAL GERAL</TableCell>
                    <TableCell className="text-right">{formatBRL(totalAssetsBrl)}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">{formatBRL(data.assets.reduce((sum, a) => sum + a.prevYearTotalCostBrl, 0))}</TableCell>
                    <TableCell className="text-right">{formatBRL(data.assets.reduce((sum, a) => sum + a.variationBrl, 0))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* GANHO DE CAPITAL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
              Ganho de Capital (Venda)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data da Venda</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Quantidade Vendida</TableHead>
                  <TableHead className="text-right">Valor de Venda (BRL)</TableHead>
                  <TableHead className="text-right">Custo (BRL)</TableHead>
                  <TableHead className="text-right">Ganho/Prejuízo (BRL)</TableHead>
                  <TableHead className="text-right">Imposto (15%) (BRL)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.capitalGains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhuma venda registrada no ano-base.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.capitalGains.map((gain, i) => (
                    <TableRow key={i}>
                      <TableCell>{gain.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</TableCell>
                      <TableCell className="font-medium">{gain.symbol}</TableCell>
                      <TableCell className="text-right">{gain.quantity.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{formatBRL(gain.saleValueBrl)}</TableCell>
                      <TableCell className="text-right">{formatBRL(gain.costBrl)}</TableCell>
                      <TableCell className={`text-right ${gain.gainLossBrl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatBRL(gain.gainLossBrl)}
                      </TableCell>
                      <TableCell className="text-right">{formatBRL(gain.tax15Brl)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* DIVIDENDOS RECEBIDOS NO ANO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
              Dividendos Recebidos no Ano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Valor Bruto (USD)</TableHead>
                  <TableHead className="text-right">Valor Bruto (BRL)</TableHead>
                  <TableHead className="text-right">Imposto Retido no Exterior (USD)</TableHead>
                  <TableHead className="text-right">Imposto Retido no Exterior (BRL)</TableHead>
                  <TableHead className="text-right">Valor Líquido (BRL)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.dividends.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum dividendo recebido no ano-base.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.dividends.map((div, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{div.symbol}</TableCell>
                      <TableCell className="text-right">{formatUSD(div.grossUsd)}</TableCell>
                      <TableCell className="text-right">{formatBRL(div.grossBrl)}</TableCell>
                      <TableCell className="text-right text-rose-600">{formatUSD(div.taxWithheldUsd)}</TableCell>
                      <TableCell className="text-right text-rose-600">{formatBRL(div.taxWithheldBrl)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatBRL(div.grossBrl - div.taxWithheldBrl)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* RESUMO FINAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-muted">
            <CardContent className="p-6">
              <p className="text-sm opacity-80">Patrimônio (Bens e Direitos)</p>
              <p className="text-3xl font-bold mt-2">{formatBRL(totalAssetsBrl)}</p>
              <p className="text-xs opacity-60 mt-1">Valor a declarar em 31/12/{baseYear}</p>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Impostos no Ano</p>
              <p className="text-3xl font-bold mt-2">{formatBRL(totalTaxesBrl)}</p>
              <p className="text-xs text-muted-foreground mt-1">Baseado em operações de venda</p>
            </CardContent>
          </Card>
        </div>

      </div>
    </Page>
  );
}
