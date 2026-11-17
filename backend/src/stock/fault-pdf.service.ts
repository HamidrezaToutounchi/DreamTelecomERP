import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
const PdfPrinter = require('pdfmake');

@Injectable()
export class FaultPdfService {
  private readonly logger = new Logger(FaultPdfService.name);
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
      this.logger.log('FaultPdfService: pdfmake fontları başarıyla yüklendi.');
    } catch (e: any) {
      this.logger.error('FaultPdfService font yükleme hatası: ' + (e?.message || e));
    }
  }

  async generateFaultSlip(fault: any): Promise<Buffer> {
    const primaryColor = '#004A93';
    const darkColor = '#1E293B';
    const lightBg = '#F8FAFC';
    const borderColor = '#CBD5E1';

    const formatDate = (date: Date | string | null | undefined) => {
      if (!date) return '-';
      const d = new Date(date);
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const statusTranslations: Record<string, string> = {
      RECEIVED: 'Kabul Edildi (Bekliyor)',
      IN_INSPECTION: 'İncelemede / Test Ediliyor',
      WAITING_PARTS: 'Parça Bekliyor / Tedarikçide',
      SENT_TO_SUPPLIER: 'Distribütöre / Tedarikçiye Gönderildi',
      RESOLVED: 'Onarıldı (Tamamlandı)',
      REPLACED: 'Birebir Değişim Yapıldı',
      SCRAPPED: 'Hurdaya Ayrıldı',
      RETURNED_TO_CUSTOMER: 'Müşteriye Teslim Edildi',
    };

    const priorityTranslations: Record<string, string> = {
      LOW: 'Düşük',
      MEDIUM: 'Normal',
      HIGH: 'Yüksek',
      URGENT: 'Acil',
    };

    // Dream Telecom Logo Yükleme
    let logoDef: any = {
      text: 'DREAM TELECOM',
      fontSize: 18,
      bold: true,
      color: primaryColor,
    };

    const candidateLogoPaths = [
      path.join(process.cwd(), 'assets', 'logo.png'),
      path.join(process.cwd(), 'backend', 'assets', 'logo.png'),
      path.resolve(__dirname, '..', '..', 'assets', 'logo.png'),
      path.resolve(__dirname, '..', '..', 'backend', 'assets', 'logo.png'),
      path.resolve(__dirname, '..', '..', '..', 'assets', 'logo.png'),
      path.resolve(__dirname, '..', '..', '..', 'backend', 'assets', 'logo.png'),
      path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', 'logo.png'),
    ];

    for (const p of candidateLogoPaths) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          if (buf && buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
            logoDef = {
              image: `data:image/png;base64,${buf.toString('base64')}`,
              width: 130,
            };
            break;
          }
        } catch {
          // fallback to text
        }
      }
    }

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [36, 36, 36, 40],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: darkColor,
      },
      content: [
        // Header
        {
          columns: [
            {
              width: '*',
              stack: [
                logoDef,
                { text: 'Teknik Servis & RMA Hizmetleri', fontSize: 9, color: '#64748B', margin: [0, 4, 0, 0] },
              ],
            },
            {
              width: 'auto',
              alignment: 'right',
              stack: [
                { text: 'SERVİS KABUL & ARIZA FORMU', fontSize: 13, bold: true, color: primaryColor },
                { text: `Kayıt No: ${fault.faultNumber}`, fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
                { text: `Tarih: ${formatDate(fault.receivedDate)}`, fontSize: 9, color: '#64748B', margin: [0, 1, 0, 0] },
              ],
            },
          ],
        },
        {
          canvas: [{ type: 'line', x1: 0, y1: 10, x2: 523, y2: 10, lineWidth: 1.5, lineColor: primaryColor }],
          margin: [0, 0, 0, 15],
        },

        // 2-Column Info Table
        {
          table: {
            widths: ['50%', '50%'],
            body: [
              [
                {
                  fillColor: lightBg,
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'MÜŞTERİ BİLGİLERİ', bold: true, color: primaryColor, fontSize: 10, margin: [0, 0, 0, 6] },
                    {
                      columns: [
                        { width: 75, text: 'Müşteri / Firma:', bold: true, color: '#475569' },
                        { width: '*', text: fault.customer?.companyName || 'Belirtilmedi' },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 75, text: 'İrtibat Kişisi:', bold: true, color: '#475569' },
                        { width: '*', text: fault.contactPerson || '-' },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 75, text: 'Telefon:', bold: true, color: '#475569' },
                        { width: '*', text: fault.contactPhone || fault.customer?.phone || '-' },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 75, text: 'Kayıt Açan:', bold: true, color: '#475569' },
                        { width: '*', text: fault.createdBy?.fullName || '-' },
                      ],
                    },
                  ],
                },
                {
                  fillColor: lightBg,
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'CİHAZ VE GARANTİ BİLGİLERİ', bold: true, color: primaryColor, fontSize: 10, margin: [0, 0, 0, 6] },
                    {
                      columns: [
                        { width: 85, text: 'Ürün Adı:', bold: true, color: '#475569' },
                        { width: '*', text: fault.serial?.product?.name || '-' },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 85, text: 'Marka / Model:', bold: true, color: '#475569' },
                        { width: '*', text: `${fault.serial?.product?.brand || '-'} / ${fault.serial?.product?.model || '-'}` },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 85, text: 'Seri Numarası:', bold: true, color: '#475569' },
                        { width: '*', text: fault.serial?.serial || fault.serial?.serialNumber || '-', bold: true },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 85, text: 'MAC Adresi:', bold: true, color: '#475569' },
                        { width: '*', text: fault.serial?.macAddress || '-' },
                      ],
                      margin: [0, 0, 0, 3],
                    },
                    {
                      columns: [
                        { width: 85, text: 'Garanti Durumu:', bold: true, color: '#475569' },
                        {
                          width: '*',
                          text: fault.underCustomerWarranty ? 'GARANTİ KAPSAMINDA' : 'GARANTİ DIŞI',
                          bold: true,
                          color: fault.underCustomerWarranty ? '#166534' : '#991B1B',
                        },
                      ],
                    },
                  ],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => borderColor,
            vLineColor: () => borderColor,
          },
          margin: [0, 0, 0, 14],
        },

        // Status & Priority Bar
        {
          table: {
            widths: ['33%', '33%', '34%'],
            body: [
              [
                { text: `Durum: ${statusTranslations[fault.status] || fault.status}`, bold: true, alignment: 'center' },
                { text: `Öncelik: ${priorityTranslations[fault.priority] || fault.priority}`, bold: true, alignment: 'center' },
                { text: `Tedarikçi Garantisi: ${fault.underSupplierWarranty ? 'Evet' : 'Hayır'}`, bold: true, alignment: 'center' },
              ],
            ],
          },
          layout: {
            fillColor: () => '#EFF6FF',
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#BFDBFE',
            vLineColor: () => '#BFDBFE',
          },
          margin: [0, 0, 0, 14],
        },

        // Reported Problem Box
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  fillColor: '#FFFBEB',
                  margin: [8, 8, 8, 8],
                  stack: [
                    { text: 'MÜŞTERİ TARAFINDAN BİLDİRİLEN ARIZA / ŞİKAYET', bold: true, color: '#92400E', fontSize: 10, margin: [0, 0, 0, 6] },
                    { text: fault.reportedProblem || 'Açıklama girilmedi.', color: '#78350F', lineHeight: 1.3 },
                  ],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#FDE68A',
            vLineColor: () => '#FDE68A',
          },
          margin: [0, 0, 0, 14],
        },

        // Technician Notes / Resolution (if any)
        ...(fault.technicianNotes || fault.resolutionSummary
          ? [
              {
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        fillColor: lightBg,
                        margin: [8, 8, 8, 8],
                        stack: [
                          { text: 'TEKNİK SERVİS VE ÇÖZÜM NOTLARI', bold: true, color: primaryColor, fontSize: 10, margin: [0, 0, 0, 6] },
                          ...(fault.technicianNotes
                            ? [{ text: `Teknisyen Notu: ${fault.technicianNotes}`, margin: [0, 0, 0, 4] }]
                            : []),
                          ...(fault.resolutionSummary
                            ? [{ text: `Çözüm Özeti: ${fault.resolutionSummary}`, bold: true }]
                            : []),
                        ],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                  hLineColor: () => borderColor,
                  vLineColor: () => borderColor,
                },
                margin: [0, 0, 0, 14],
              },
            ]
          : []),

        // Terms and conditions
        {
          text: 'ŞARTLAR VE BİLGİLENDİRME',
          fontSize: 8,
          bold: true,
          color: '#64748B',
          margin: [0, 10, 0, 4],
        },
        {
          text: '1. Servise teslim edilen cihazların içerisindeki yazılım, konfigürasyon ve veri yedeklerinin sorumluluğu müşteriye aittir.\n2. Garanti harici işlemler için parça ve servis maliyeti onayı alınmadan müdahale edilmez.\n3. Onarımı tamamlanan veya iade kararı verilen cihazlar bildirim tarihinden itibaren 90 gün içinde teslim alınmalıdır.\n4. Bu belge cihaz teslim alınırken veya teslim edilirken ibraz edilmelidir.',
          fontSize: 7.5,
          color: '#94A3B8',
          lineHeight: 1.3,
          margin: [0, 0, 0, 25],
        },

        // Signature Fields
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Cihazı Teslim Eden (Müşteri)', bold: true, alignment: 'center' },
                { text: fault.contactPerson || fault.customer?.companyName || '', alignment: 'center', margin: [0, 2, 0, 0] },
                { text: 'İmza:', alignment: 'center', margin: [0, 35, 0, 0], color: '#64748B' },
              ],
            },
            {
              width: '50%',
              stack: [
                { text: 'Cihazı Teslim Alan (Dream Telecom)', bold: true, alignment: 'center' },
                { text: fault.createdBy?.fullName || 'Teknik Servis', alignment: 'center', margin: [0, 2, 0, 0] },
                { text: 'İmza / Kaşe:', alignment: 'center', margin: [0, 35, 0, 0], color: '#64748B' },
              ],
            },
          ],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        pdfDoc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
