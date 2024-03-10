import { Fyo } from 'fyo';
import { Action, ListViewSettings } from 'fyo/model/types';
import { LedgerPosting } from 'models/Transactional/LedgerPosting';
import { ModelNameEnum } from 'models/types';
import { getInvoiceActions, getTransactionStatusColumn } from '../../helpers';
import { Invoice } from '../Invoice/Invoice';
import { SalesInvoiceItem } from '../SalesInvoiceItem/SalesInvoiceItem';
import { MandatoryError } from 'fyo/utils/errors';

export class SalesInvoice extends Invoice {
  items?: SalesInvoiceItem[];

  async getPosting() {
    const exchangeRate = this.exchangeRate ?? 1;
    const posting: LedgerPosting = new LedgerPosting(this, this.fyo);
    if (this.isReturn) {
      await posting.credit(this.account!, this.baseGrandTotal!);
    } else {
      await posting.debit(this.account!, this.baseGrandTotal!);
    }

    for (const item of this.items!) {
      if (this.isReturn) {
        await posting.debit(item.account!, item.amount!.mul(exchangeRate));
        continue;
      }
      await posting.credit(item.account!, item.amount!.mul(exchangeRate));
    }

    if (this.taxes) {
      for (const tax of this.taxes) {
        if (this.isReturn) {
          await posting.debit(tax.account!, tax.amount!.mul(exchangeRate));
          continue;
        }
        await posting.credit(tax.account!, tax.amount!.mul(exchangeRate));
      }
    }

    const discountAmount = this.getTotalDiscount();
    const discountAccount = this.fyo.singles.AccountingSettings
      ?.discountAccount as string | undefined;
    if (discountAccount && discountAmount.isPositive()) {
      if (this.isReturn) {
        await posting.credit(discountAccount, discountAmount.mul(exchangeRate));
      } else {
        await posting.debit(discountAccount, discountAmount.mul(exchangeRate));
      }
    }

    await posting.makeRoundOffEntry();
    return posting;
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getTransactionStatusColumn(),
        'party',
        'date',
        'baseGrandTotal',
        'outstandingAmount',
      ],
    };
  }
  async beforeSubmit(): Promise<void> {
    await super.beforeSubmit();
    if (!this.items || this.items.length <= 0){
      const message = this.fyo.t`Value missing for Items Table`;
      throw new MandatoryError(message);
    }

  }
  static getActions(fyo: Fyo): Action[] {
    waitForElm(".justify-between.items-center.select-none.mb-4.cursor-pointer").then((elm) => {
      const p1Divs = document.querySelectorAll(".p-4.border-t");
  
      // Iterate over the elements to find the one with the specified h2 content
      p1Divs.forEach((div) => {
        const h2 = div.querySelector('h2');
        if (h2 && h2.textContent === "Teeth") {
          // Once the correct div is found, select the .grid class within it
          const gridDiv = div.querySelector('.grid.grid-cols-2') as HTMLElement | null;
          // Apply the new styles to the .grid div
          if (gridDiv) {
            Object.assign(gridDiv.style, {"grid-template-columns": "repeat(6, minmax(0, 1fr))"});
          }
        }
      })
    })
    
    return getInvoiceActions(fyo, ModelNameEnum.SalesInvoice);
  }
}
function waitForElm(selector: string) {
  return new Promise(resolve => {
      if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(mutations => {
          if (document.querySelector(selector)) {
              resolve(document.querySelector(selector));
              observer.disconnect();
          }
      });

      observer.observe(document.body, {
          childList: true,
          subtree: true
      });
  });
}
