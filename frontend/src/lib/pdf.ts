import axios from 'axios';
import { toast } from 'sonner';

/**
 * Teklif PDF'ini JWT yetkilendirmesiyle güvenli bir şekilde blob olarak çeker ve indirir.
 */
export async function downloadQuotePdf(quoteId: string, quoteNumber: string) {
  const toastId = toast.loading(`${quoteNumber} PDF hazırlanıyor...`);

  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`/api/v1/quotes/${quoteId}/pdf`, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prefix = quoteNumber && quoteNumber.startsWith('TS-') ? 'TescomTelecom' : 'DreamTelecom';
    link.download = `${prefix}_Teklif_${quoteNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`${quoteNumber} PDF dosyası başarıyla indirildi.`, { id: toastId });
  } catch (err: any) {
    let errorMsg = 'PDF indirilemedi. Lütfen bağlantınızı veya oturumunuzu kontrol edin.';
    if (err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        if (json.message) {
          errorMsg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
        }
      } catch {}
    } else if (err?.response?.data?.message) {
      errorMsg = err.response.data.message;
    } else if (err?.message) {
      errorMsg = err.message;
    }
    toast.error(`PDF İndirilemedi: ${errorMsg}`, { id: toastId });
  }
}
