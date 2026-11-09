import axios from 'axios';
import { toast } from 'sonner';

/**
 * Teklif PDF'ini JWT yetkilendirmesiyle güvenli bir şekilde blob olarak çeker ve indirir.
 */
export async function downloadQuotePdf(quoteId: string, quoteNumber: string) {
  const toastId = toast.loading(`${quoteNumber} PDF hazırlanıyor...`);

  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`http://localhost:3000/api/v1/quotes/${quoteId}/pdf`, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DreamTelecom_Teklif_${quoteNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`${quoteNumber} PDF dosyası başarıyla indirildi.`, { id: toastId });
  } catch (err: any) {
    toast.error('PDF indirilemedi. Lütfen oturumunuzu kontrol edin.', { id: toastId });
  }
}
