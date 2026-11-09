import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const PdfPrinter = require('pdfmake');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private printer: any;

  constructor() {
    try {
      const vfsMod = require('pdfmake/build/vfs_fonts');
      const vfs = vfsMod.pdfMake ? vfsMod.pdfMake.vfs : vfsMod;

      const fonts = {
        Roboto: {
          normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
          bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
          italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
          bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
        },
      };

      this.printer = new PdfPrinter(fonts);
      this.logger.log('PdfPrinter Roboto fontları (Türkçe UTF-8 tam destekli) başarıyla yüklendi.');
    } catch (e: any) {
      this.logger.error('PdfPrinter font yükleme hatası: ' + (e?.message || e));
    }
  }

  private formatMoney(val: any, currency = 'TRY'): string {
    if (val === null || val === undefined || val === '') return `0,00 ${currency}`;
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return `${val} ${currency}`;
    return (
      new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num) + ` ${currency}`
    );
  }

  private formatDate(dateVal: any): string {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  async generateQuotePdf(quote: any): Promise<Buffer> {
    const corporateBlue = '#004A93';
    const darkGray = '#1E293B';
    const lightGray = '#F8FAFC';
    const borderGray = '#CBD5E1';

    const customer = quote.customer || {};
    const rep = quote.rep || {};
    const items = quote.items || [];

    // Gerçek Dream Telecom Logo Base64
    let logoImageDef: any = {
      text: 'DREAM TELECOM',
      fontSize: 20,
      bold: true,
      color: corporateBlue,
    };

    const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoImageDef = {
          image: `data:image/png;base64,${logoBuffer.toString('base64')}`,
          width: 140,
        };
      } catch (err) {
        this.logger.warn('Logo okunamadı, metin kullanılacak');
      }
    }

    const tableBody: any[] = [
      [
        { text: 'Ürün / Hizmet Açıklaması', style: 'tableHeader' },
        { text: 'Miktar', style: 'tableHeader', alignment: 'center' },
        { text: `Birim Fiyat`, style: 'tableHeader', alignment: 'right' },
        { text: 'İsk. %', style: 'tableHeader', alignment: 'center' },
        { text: 'KDV %', style: 'tableHeader', alignment: 'center' },
        { text: `Toplam Tutar`, style: 'tableHeader', alignment: 'right' },
      ],
    ];

    for (const item of items) {
      // Kalem Ürün Fotoğrafı Varsa Base64 Okuma (Esnek çoklu dizin tarama)
      let itemImageDef: any = null;
      if (item.imageUrl) {
        try {
          const cleanPath = item.imageUrl.replace(/^\//, '');
          const filename = path.basename(cleanPath);
          const candidatePaths = [
            path.isAbsolute(item.imageUrl) ? item.imageUrl : null,
            path.join(process.cwd(), cleanPath),
            path.join(process.cwd(), 'backend', cleanPath),
            path.join(process.cwd(), 'backend', 'uploads', filename),
            path.join(process.cwd(), 'uploads', filename),
            path.resolve(__dirname, '..', '..', 'uploads', filename),
            path.resolve(__dirname, '..', '..', '..', 'uploads', filename),
            path.resolve(__dirname, '..', '..', '..', 'backend', 'uploads', filename),
          ].filter(Boolean) as string[];

          let foundPath: string | null = null;
          for (const cand of candidatePaths) {
            if (fs.existsSync(cand)) {
              foundPath = cand;
              break;
            }
          }

          if (foundPath) {
            const imgBuffer = fs.readFileSync(foundPath);
            const ext = path.extname(foundPath).toLowerCase().replace('.', '');
            const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            itemImageDef = {
              image: `data:${mime};base64,${imgBuffer.toString('base64')}`,
              width: 44,
              height: 44,
            };
          }
        } catch {
          // Resim okunamadıysa sessizce devam et
        }
      }

      const productDescStack: any[] = [
        { text: item.productName, bold: true, fontSize: 9.5, color: '#0F172A' },
      ];

      const brandModelText = [
        (item as any).brand ? `Marka: ${(item as any).brand}` : '',
        (item as any).model ? `Model: ${(item as any).model}` : '',
        item.productCode ? `Kod: ${item.productCode}` : '',
      ].filter(Boolean).join(' • ');

      if (brandModelText) {
        productDescStack.push({
          text: brandModelText,
          fontSize: 7.5,
          color: '#475569',
          bold: true,
          margin: [0, 1, 0, 0],
        });
      }

      if (item.description) {
        productDescStack.push({
          text: item.description,
          fontSize: 8,
          color: '#64748B',
          margin: [0, 2, 0, 0],
        });
      }

      const firstColContent = itemImageDef
        ? {
            columns: [
              { width: 48, stack: [itemImageDef] },
              { width: '*', stack: productDescStack },
            ],
            columnGap: 8,
          }
        : { stack: productDescStack };

      tableBody.push([
        firstColContent,
        { text: item.quantity.toString(), fontSize: 9, alignment: 'center' },
        { text: this.formatMoney(item.unitPrice, quote.currency), fontSize: 9, alignment: 'right' },
        {
          text: item.discountRate ? `%${item.discountRate}` : '%0',
          fontSize: 9,
          alignment: 'center',
        },
        { text: `%${item.taxRate}`, fontSize: 9, alignment: 'center' },
        {
          text: this.formatMoney(item.lineTotal, quote.currency),
          bold: true,
          fontSize: 9,
          alignment: 'right',
          color: corporateBlue,
        },
      ]);
    }

    const statusTranslations: Record<string, string> = {
      DRAFT: 'Taslak (DRAFT)',
      SENT: 'Müşteriye Sunuldu (SENT)',
      APPROVED: 'Onaylandı (APPROVED)',
      REJECTED: 'Reddedildi (REJECTED)',
      REVISED: 'Revize Edildi (REVISED)',
    };

    // KDV etiketi dinamik hesaplama (tüm kalemler aynı KDV oranına sahipse örn: %10, farklı ise 'KDV Toplamı:')
    const taxRates = (quote.items || []).map((it: any) => it.taxRate ?? 20);
    const uniqueTaxRates = Array.from(new Set(taxRates));
    const kdvLabel = uniqueTaxRates.length === 1 ? `KDV Toplamı (%${uniqueTaxRates[0]}):` : 'KDV Toplamı:';

    const docDefinition: any = {
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: darkGray,
        lineHeight: 1.25,
      },
      content: [
        // Header: Logo ve Teklif Bilgileri
        {
          columns: [
            {
              width: '55%',
              stack: [
                logoImageDef,
                {
                  text: 'Satış & Müşteri İlişkileri Portalı',
                  fontSize: 8.5,
                  color: '#64748B',
                  margin: [0, 4, 0, 0],
                },
                {
                  text: 'info@dreamtelecom.com | +90 (850) 123 45 67 | www.dreamtelecom.com',
                  fontSize: 8,
                  color: '#94A3B8',
                  margin: [0, 2, 0, 0],
                },
              ],
            },
            {
              width: '45%',
              stack: [
                {
                  text: 'KURUMSAL TEKLİF FORMU',
                  fontSize: 16,
                  bold: true,
                  color: corporateBlue,
                  alignment: 'right',
                },
                {
                  text: [
                    { text: 'Teklif No: ', bold: true },
                    { text: quote.quoteNumber, color: corporateBlue, bold: true },
                  ],
                  fontSize: 10,
                  alignment: 'right',
                  margin: [0, 4, 0, 0],
                },
                {
                  text: `Revizyon: v${quote.version || 1}`,
                  fontSize: 8.5,
                  color: '#64748B',
                  alignment: 'right',
                },
                {
                  text: `Tarih: ${this.formatDate(quote.createdAt)}`,
                  fontSize: 8.5,
                  color: '#64748B',
                  alignment: 'right',
                },
                {
                  text: `Geçerlilik: ${this.formatDate(quote.validUntil)}`,
                  fontSize: 8.5,
                  color: '#64748B',
                  alignment: 'right',
                },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Mavi Ayırıcı Çizgi
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 515,
              y2: 0,
              lineWidth: 2,
              lineColor: corporateBlue,
            },
          ],
          margin: [0, 0, 0, 16],
        },

        // Müşteri & Temsilci Bilgileri (2 Kolon)
        {
          columns: [
            {
              width: '50%',
              stack: [
                {
                  text: 'MÜŞTERİ BİLGİLERİ',
                  fontSize: 9.5,
                  bold: true,
                  color: corporateBlue,
                  margin: [0, 0, 0, 4],
                },
                { text: customer.companyName || '-', bold: true, fontSize: 10, color: '#0F172A' },
                { text: `Yetkili: ${customer.contactPerson || '-'}` },
                { text: `Telefon: ${customer.phone || '-'}` },
                { text: `E-posta: ${customer.email || '-'}` },
                customer.taxNumber
                  ? {
                      text: `Vergi Dairesi / No: ${customer.taxOffice || '-'} / ${customer.taxNumber}`,
                    }
                  : {},
              ],
            },
            {
              width: '50%',
              stack: [
                {
                  text: 'SATIŞ TEMSİLCİSİ BİLGİLERİ',
                  fontSize: 9.5,
                  bold: true,
                  color: corporateBlue,
                  margin: [0, 0, 0, 4],
                },
                { text: rep.fullName || '-', bold: true, fontSize: 10, color: '#0F172A' },
                { text: `E-posta: ${rep.email || '-'}` },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Kalemler Tablosu
        {
          table: {
            headerRows: 1,
            widths: ['*', 45, 80, 50, 45, 85],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return corporateBlue;
              return rowIndex % 2 === 0 ? lightGray : '#FFFFFF';
            },
            hLineColor: () => borderGray,
            vLineColor: () => borderGray,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 0, 0, 16],
        },

        // Toplamlar Tablosu (Sağa Hizalı)
        {
          columns: [
            { width: '45%', text: '' },
            {
              width: '55%',
              table: {
                widths: ['55%', '45%'],
                body: [
                  [
                    { text: 'Ara Toplam:', bold: true, alignment: 'right', fontSize: 9.5 },
                    {
                      text: this.formatMoney(quote.subTotal, quote.currency),
                      alignment: 'right',
                      fontSize: 9.5,
                    },
                  ],
                  [
                    { text: kdvLabel, bold: true, alignment: 'right', fontSize: 9.5 },
                    {
                      text: this.formatMoney(quote.taxTotal, quote.currency),
                      alignment: 'right',
                      fontSize: 9.5,
                    },
                  ],
                  [
                    {
                      text: 'GENEL TOPLAM:',
                      bold: true,
                      fontSize: 11,
                      color: corporateBlue,
                      alignment: 'right',
                    },
                    {
                      text: this.formatMoney(quote.grandTotal, quote.currency),
                      bold: true,
                      fontSize: 11,
                      color: corporateBlue,
                      alignment: 'right',
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: (i: number) => (i === 2 ? 1.5 : 0),
                vLineWidth: () => 0,
                hLineColor: () => corporateBlue,
                paddingTop: () => 4,
                paddingBottom: () => 4,
              },
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Notlar ve Koşullar
        quote.notes
          ? {
              stack: [
                {
                  text: 'ÖZEL NOTLAR',
                  fontSize: 9.5,
                  bold: true,
                  color: corporateBlue,
                  margin: [0, 0, 0, 2],
                },
                { text: quote.notes, fontSize: 8.5, color: '#334155' },
              ],
              margin: [0, 0, 0, 10],
            }
          : {},

        quote.terms
          ? {
              stack: [
                {
                  text: 'ŞARTLAR VE KOŞULLAR',
                  fontSize: 9.5,
                  bold: true,
                  color: corporateBlue,
                  margin: [0, 0, 0, 2],
                },
                { text: quote.terms, fontSize: 8.5, color: '#334155' },
              ],
              margin: [0, 0, 0, 20],
            }
          : {},

        // İmza ve Onay Bölümü
        {
          columns: [
            {
              width: '50%',
              stack: [
                {
                  text: 'Hazırlayan / Satış Temsilcisi',
                  fontSize: 9.5,
                  bold: true,
                  alignment: 'center',
                },
                {
                  text: `${rep.fullName || 'Dream Telecom Yetkilisi'}`,
                  fontSize: 9,
                  alignment: 'center',
                  margin: [0, 30, 0, 0],
                },
                { text: 'İmza & Kaşe', fontSize: 8, color: '#94A3B8', alignment: 'center' },
              ],
            },
            {
              width: '50%',
              stack: [
                { text: 'Müşteri Onayı', fontSize: 9.5, bold: true, alignment: 'center' },
                {
                  text: `${customer.companyName || customer.contactPerson || 'Müşteri Yetkilisi'}`,
                  fontSize: 9,
                  alignment: 'center',
                  margin: [0, 30, 0, 0],
                },
                { text: 'Kaşe & Yetkili İmza', fontSize: 8, color: '#94A3B8', alignment: 'center' },
              ],
            },
          ],
          margin: [0, 20, 0, 0],
        },
      ],
      styles: {
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: 'white',
        },
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    });
  }
}
