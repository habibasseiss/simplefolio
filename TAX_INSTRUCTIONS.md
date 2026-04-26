# Brazilian Income Tax: Foreign Stock Investments
## A Compliance Guide for Brazilian Residents — Updated for Lei nº 14.754/2023

---

## Overview

This document provides implementation-ready instructions for Brazilian individual taxpayers (*pessoas físicas*) to report income tax on direct foreign stock and ETF investments. All rules reflect **Lei nº 14.754/2023** (effective January 1, 2024), which fundamentally changed the taxation of foreign investments, and the **Instrução Normativa RFB nº 2.180/2024**, which regulated its application.

> ⚠️ **Important:** The pre-2024 regime required monthly capital gains calculation via GCAP/DARF. Under Lei 14.754/2023, foreign investment income is now subject to **annual taxation** declared in the *Declaração de Ajuste Anual* (DAA). The GCAP tool and monthly DARF flow are **no longer applicable** to foreign stocks and ETFs classified as *aplicações financeiras no exterior*.

---

## 1. Asset Summary — "Bens e Direitos"

Maintain a year-end position per asset to populate the **Bens e Direitos** section of the DAA.

### Data Per Asset

- `quantity_current`
- `total_cost_brl` (cost basis of remaining units)

### Rules

1. **Convert each purchase to BRL**
   - Use the **PTAX selling rate** (*cotação de venda*) published by the Banco Central do Brasil on the transaction settlement date
   - If no rate exists for that date (weekend/holiday), use the last prior business day's rate

2. **Store cost at transaction time (immutable)**
   - Do not recompute later using updated exchange rates

3. **Accumulate cost basis**

   ```
   total_cost_brl = sum(all purchase BRL amounts)
   total_quantity = sum(all purchased quantities)
   ```

4. **Handle partial sales (average cost method)**

   ```
   avg_cost       = total_cost_brl / total_quantity
   cost_sold      = quantity_sold × avg_cost
   remaining_cost = total_cost_brl - cost_sold
   remaining_qty  = total_quantity - quantity_sold
   ```

5. **Do NOT mark to market**
   - Ignore current market value
   - Use historical cost only

### Output Per Asset (for December 31)

- Quantity held
- Total cost in BRL (remaining position)
- Prior year value (for comparison)

---

## 2. Capital Gains on Sales

All gains and losses from sales of foreign stocks are classified as **rendimentos de aplicações financeiras no exterior** under Lei 14.754/2023 and are taxed annually at a flat **15%** rate, declared in the DAA.

### Step 1: Convert Sale Proceeds to BRL

```
sale_value_brl = sale_amount_usd × PTAX_buying_rate (date of settlement)
```

> Use the **PTAX buying rate** (*cotação de compra*) for the sale, and the **PTAX selling rate** (*cotação de venda*) for the original acquisition cost. These are different rates published daily by the Banco Central do Brasil.

### Step 2: Determine Cost Basis

Use the proportional cost from historical BRL cost basis via the **average cost method** (as described in Section 1).

### Step 3: Calculate Gain or Loss

```
gain_brl = sale_value_brl - cost_basis_brl
```

### Step 4: Annual Aggregation

- Aggregate all sales across the full calendar year (January–December)
- Offset gains against losses within the same year
- **Losses cannot be carried forward** to future years under the annual regime

### Step 5: Tax Rate

- Apply a **flat 15% rate** on the net annual gain
- There is **no exemption threshold** for foreign assets (the R$35,000/month exemption applies only to Brazilian domestic stock sales)

### Step 6: Declaration and Payment

- Declare gains in the **annual DAA** (Declaração de Ajuste Anual)
- Tax is paid **once per year** alongside the annual income tax return
- No monthly DARF or GCAP filing is required for foreign stocks under the current regime

### Notes

- Tax is triggered only upon **realization** (sale); simply holding an asset while the exchange rate fluctuates is not a taxable event
- The gain calculation in BRL automatically incorporates exchange rate variation — no separate FX gain calculation is needed
- All values must be expressed in BRL

---

## 3. Dividends Received

### Step 1: Store Full Event Data

For each dividend payment, record:

- `gross_dividend_usd` — amount before any withholding
- `withheld_tax_usd` — tax retained at source (e.g., 30% US withholding for non-residents without a tax treaty)
- `net_dividend_usd` — amount actually received

### Step 2: Convert to BRL

Use the **PTAX buying rate** (*cotação de compra*) from the Banco Central do Brasil on the **payment date**:

```
gross_dividend_brl = gross_dividend_usd × PTAX_buying_rate
withheld_tax_brl   = withheld_tax_usd   × PTAX_buying_rate
net_dividend_brl   = net_dividend_usd   × PTAX_buying_rate
```

### Step 3: Aggregate Totals (Recommended by Country)

- `total_gross_dividends_brl`
- `total_foreign_tax_paid_brl`
- `total_net_received_brl`

### Step 4: Tax Treatment in Brazil

- Dividends from foreign stocks are classified as **rendimentos de aplicações financeiras no exterior**
- Tax is calculated on the **gross dividend** (before foreign withholding)
- The applicable Brazilian rate is a **flat 15%**
- Declaration is made annually in the DAA under *Rendimentos do Exterior*
- Foreign withholding tax is declared as *Imposto pago no exterior* and used as a **foreign tax credit**

### Step 5: Foreign Tax Credit and Limitation

```
brazilian_tax_due = gross_dividend_brl × 15%
usable_credit     = min(foreign_tax_paid_brl, brazilian_tax_due)
net_tax_owed_br   = brazilian_tax_due - usable_credit
```

- Excess foreign tax is **not refundable** and **cannot be carried forward**
- If the foreign withholding rate equals or exceeds 15% (e.g., the standard 30% US withholding for non-residents without a tax treaty), the Brazilian tax liability on that dividend income is **fully offset** — no additional tax is owed to Brazil
- Even when no additional tax is owed, the dividend **must still be declared** in the DAA

#### Practical Example (US Stocks, No Tax Treaty)

| Item | Per $100 Gross Dividend |
|------|------------------------|
| Gross dividend | $100.00 |
| US withholding (30%) | − $30.00 |
| Net received | $70.00 |
| Brazilian tax due (15% of $100) | $15.00 |
| Foreign tax credit (capped at $15) | − $15.00 |
| **Extra tax owed to Brazil** | **$0.00** |
| **Total effective tax rate** | **30% (all to the US)** |

### Output

- Total gross dividends (BRL)
- Total foreign tax paid (BRL)
- Total net tax owed to Brazil (BRL)

---

## 4. General Rules

### Exchange Rate

| Transaction Type | PTAX Rate to Use |
|-----------------|-----------------|
| Purchase of asset (cost basis) | **PTAX selling rate** (*cotação de venda*) |
| Sale of asset (proceeds) | **PTAX buying rate** (*cotação de compra*) |
| Dividend received | **PTAX buying rate** (*cotação de compra*) |

- Source: Banco Central do Brasil — [https://www.bcb.gov.br](https://www.bcb.gov.br)
- If the rate for a given date is unavailable (weekend/holiday), use the last prior business day's rate
- Store the exchange rate per transaction at the time of recording — **do not recalculate later**
- All final values must be expressed in **BRL**

### Audit Trail

Maintain a full transaction log including:
- Date
- Asset identifier
- Quantity
- USD (or foreign currency) value
- PTAX rate used
- BRL equivalent

---

## 5. System Design Requirements

- Store transactions with **immutable FX rates** recorded at time of execution
- Maintain a separate PTAX history table (optional but strongly recommended)
- Support:
  - Average cost calculation per asset
  - Annual gain/loss aggregation
  - Dividend gross/net/tax tracking
  - Foreign tax credit calculation per dividend event

- Provide outputs directly mappable to DAA sections:
  - **Bens e Direitos** — asset positions at cost
  - **Rendimentos do Exterior** — dividends (gross, tax credit, net tax owed)
  - **Renda Variável / Aplicações Financeiras no Exterior** — annual capital gains

---

## 6. Legal References

| Rule | Instrument |
|------|-----------|
| Annual taxation of foreign investments | Lei nº 14.754/2023 |
| Regulatory guidance on foreign assets | Instrução Normativa RFB nº 2.180/2024 |
| Foreign tax credit rules | Lei nº 14.754/2023, Art. 5º |
| PTAX rate source | Banco Central do Brasil |

---

*This document reflects the rules in force as of 2024–2026. Brazilian tax law is subject to change; consult a qualified tax advisor for individual guidance.*
