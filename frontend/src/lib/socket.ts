import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { QueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

export const initSocket = (userId: string, queryClient: QueryClient) => {
  if (socket) {
    socket.disconnect();
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  socket = io(socketUrl, {
    query: { userId },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket?.emit('join_user_room', { userId });
  });

  // Event 1: Yeni Lead Ataması
  socket.on('new_leads_assigned', (data: { message: string; count: number }) => {
    toast.info('🎯 Yeni Potansiyel Müşteri (Lead) Atandı!', {
      description: data.message || `${data.count} yeni lead listenize eklendi.`,
      duration: 5000,
    });
    // Invalidate leads query cache
    queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
  });

  // Event 2: Teklif Durumu Değişikliği
  socket.on('quote_status_changed', (data: { quoteNumber: string; status: string; reason?: string; message: string }) => {
    const isApproved = data.status === 'APPROVED';
    const isRejected = data.status === 'REJECTED';

    if (isApproved) {
      toast.success('🎉 Teklif Onaylandı!', {
        description: `${data.quoteNumber} numaralı teklifiniz onaylandı. Satışa dönüştürebilirsiniz.`,
        duration: 6000,
      });
    } else if (isRejected) {
      toast.error('❌ Teklif Reddedildi', {
        description: `${data.quoteNumber}: ${data.reason || 'Müşteri teklifi reddetti.'}`,
        duration: 6000,
      });
    } else {
      toast.info('📝 Teklif Güncellendi', {
        description: data.message,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/analytics/dashboard-summary'] });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
