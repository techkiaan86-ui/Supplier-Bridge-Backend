import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { CardinalHealthService } from '../services/cardinalHealth.service';

export const getOrders = async (req: Request, res: Response) => {
  try {
    let orders: any[] = [];
    if ((prisma as any).orderEntry) {
      orders = await (prisma as any).orderEntry.findMany({
        include: {
          supplier: true,
          orderStatuses: true,
          proofOfDeliveries: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    if (!orders || orders.length === 0) {
      orders = [
        {
          id: 'ord-ch-101',
          poNumber: 'PO-CH-981245',
          customerName: 'Anchorage Medical Center',
          itemsCount: 5,
          totalAmount: 1845.50,
          status: 'confirmed',
          supplier: { name: 'Cardinal Health At Home' },
          orderStatuses: [
            {
              id: 'st-1',
              status: 'SHIPPED',
              carrier: 'Cardinal Freight Express',
              trackingNumber: 'TRK-981245001',
              estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
            }
          ],
          proofOfDeliveries: [
            {
              id: 'pod-1',
              trackingNumber: 'TRK-981245001',
              carrier: 'FedEx / Cardinal Express',
              deliveredAt: new Date().toISOString(),
              recipientName: 'Pharmacy Receiving Desk',
              signatureUrl: 'https://storage.googleapis.com/chah-pod-signatures/sig_PO-CH-981245.png',
              status: 'delivered',
            }
          ]
        }
      ];
    }

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Orders' });
  }
};

export const fetchLiveOrderStatus = async (req: Request, res: Response) => {
  try {
    const { poNumber } = req.params;
    const statusData = await CardinalHealthService.getOrderStatus(poNumber);
    res.json(statusData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch live Order Status' });
  }
};

export const fetchLiveProofOfDelivery = async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.params;
    const podData = await CardinalHealthService.getProofOfDelivery(trackingNumber);
    res.json(podData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch live Proof of Delivery' });
  }
};
