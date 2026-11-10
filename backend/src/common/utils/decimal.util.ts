import Decimal from 'decimal.js';

// Decimal.js precision setup
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class DecimalUtil {
  /**
   * Sayı veya string'i güvenli bir şekilde Decimal objesine dönüştürür
   */
  static toDecimal(val: string | number | Decimal | undefined | null): Decimal {
    if (val === undefined || val === null || val === '') {
      return new Decimal(0);
    }
    if (val instanceof Decimal) return val;
    try {
      const sanitized = String(val).trim().replace(/,/g, '.');
      const clean = sanitized.endsWith('.') ? sanitized.slice(0, -1) || '0' : sanitized;
      return new Decimal(clean === '' || clean === '.' || clean === '-' ? 0 : clean);
    } catch {
      return new Decimal(0);
    }
  }

  /**
   * 2 ondalıklı para string'i (örn: "1250.50")
   */
  static formatMoney(val: string | number | Decimal | undefined | null): string {
    return this.toDecimal(val).toFixed(2);
  }

  /**
   * Teklif kalemi satır toplamı:
   * lineTotal = quantity * unitPrice * (1 - discountRate / 100)
   */
  static calculateLineTotal(
    quantity: number,
    unitPrice: string | number | Decimal,
    discountRate: string | number | Decimal = 0,
  ): { lineTotal: string; lineSubtotalBeforeDiscount: string; discountAmount: string } {
    const qty = new Decimal(quantity);
    const price = this.toDecimal(unitPrice);
    const disc = this.toDecimal(discountRate);

    const lineSubtotal = qty.times(price);
    const discountAmount = lineSubtotal.times(disc).dividedBy(100);
    const lineTotal = lineSubtotal.minus(discountAmount);

    return {
      lineTotal: lineTotal.toFixed(2),
      lineSubtotalBeforeDiscount: lineSubtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
    };
  }

  /**
   * Teklif kalemlerinin toplamlarını hesaplar
   */
  static calculateQuoteTotals(
    items: Array<{
      quantity: number;
      unitPrice: string | number | Decimal;
      discountRate?: string | number | Decimal;
      taxRate?: number;
    }>,
  ): {
    subTotal: string;
    taxTotal: string;
    grandTotal: string;
    calculatedItems: Array<{
      lineTotal: string;
      taxAmount: string;
    }>;
  } {
    let subTotalAcc = new Decimal(0);
    let taxTotalAcc = new Decimal(0);

    const calculatedItems = items.map((item) => {
      const { lineTotal } = this.calculateLineTotal(
        item.quantity,
        item.unitPrice,
        item.discountRate || 0,
      );
      const lineDec = new Decimal(lineTotal);
      const taxRateDec = new Decimal(item.taxRate ?? 20).dividedBy(100);
      const taxAmountDec = lineDec.times(taxRateDec);

      subTotalAcc = subTotalAcc.plus(lineDec);
      taxTotalAcc = taxTotalAcc.plus(taxAmountDec);

      return {
        lineTotal,
        taxAmount: taxAmountDec.toFixed(2),
      };
    });

    const grandTotal = subTotalAcc.plus(taxTotalAcc);

    return {
      subTotal: subTotalAcc.toFixed(2),
      taxTotal: taxTotalAcc.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      calculatedItems,
    };
  }
}
