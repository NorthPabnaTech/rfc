import 'server-only';

import { connectDB, OrderModel } from '@/database';
import { AppError } from '@lib/errors';
import {
  createPaymentlyCharge,
  verifyOrderPaymentToken,
  verifyPaymentlyInvoice,
} from '@lib/payments/paymently';

/**
 * Create a Paymently hosted checkout session for an existing unpaid order.
 * Validates ownership (authenticated user OR signed checkout paymentToken),
 * order eligibility, and reads the authoritative amount from MongoDB.
 */
export async function createPaymentlySessionForOrder(input: {
  orderId: string;
  userId: string | null;
  paymentToken?: string | null;
  origin: string;
}): Promise<{ paymentUrl: string }> {
  await connectDB();
  const order = await OrderModel.findById(input.orderId).lean();
  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  const orderIdStr = String(order._id);
  const ownerMatches = Boolean(input.userId && order.user && String(order.user) === input.userId);
  const tokenMatches = verifyOrderPaymentToken(orderIdStr, order.orderNumber, input.paymentToken);

  if (!ownerMatches && !tokenMatches) {
    throw new AppError('You are not authorized to pay for this order.', 403);
  }

  if (order.paymentStatus === 'paid') {
    throw new AppError('This order has already been paid.', 400);
  }
  if (order.paymentStatus === 'refunded') {
    throw new AppError('Refunded orders cannot be paid again.', 400);
  }
  if (order.status === 'cancelled' || order.status === 'returned') {
    throw new AppError('Cancelled or returned orders cannot be paid.', 400);
  }
  if (order.total <= 0) {
    throw new AppError('Invalid order amount.', 400);
  }

  const encodedOrder = encodeURIComponent(order.orderNumber);
  const redirectUrl = `${input.origin}/order-success/${encodedOrder}`;
  const cancelUrl = `${input.origin}/order-success/${encodedOrder}?cancelled=1`;
  const webhookUrl = `${input.origin}/api/payments/paymently/webhook`;

  const { paymentUrl } = await createPaymentlyCharge({
    fullName: order.customer.name,
    email: order.customer.email || 'customer@rfcgadget.com',
    amount: order.total,
    metadata: {
      order_id: orderIdStr,
      order_number: order.orderNumber,
    },
    redirectUrl,
    cancelUrl,
    webhookUrl,
  });

  await OrderModel.updateOne(
    { _id: order._id, paymentStatus: { $ne: 'paid' } },
    { $set: { paymentGateway: 'paymently' } },
  );

  return { paymentUrl };
}

export type VerifyOrderPaymentResult = {
  verified: boolean;
  alreadyPaid?: boolean;
  status: 'COMPLETED' | 'PENDING' | 'ERROR';
  orderNumber?: string;
  paymentStatus?: string;
  message: string;
};

/**
 * Verify a Paymently transaction server-side via Paymently's Verify Payment API
 * and atomically mark the matching MongoDB order as `paid`.
 * Idempotent across concurrent webhook and redirect verification calls.
 */
export async function verifyAndCompletePaymentlyOrder(input: {
  invoiceId: string;
  expectedOrderNumber?: string;
}): Promise<VerifyOrderPaymentResult> {
  const invoiceId = input.invoiceId.trim();
  if (!invoiceId) {
    throw new AppError('Missing Paymently invoice ID.', 400);
  }

  const verified = await verifyPaymentlyInvoice(invoiceId);
  if (verified.status !== 'COMPLETED') {
    return {
      verified: false,
      status: verified.status,
      message:
        verified.status === 'PENDING'
          ? 'Payment is still pending confirmation.'
          : verified.message || 'Payment could not be completed.',
    };
  }

  await connectDB();

  const metaOrderId = verified.metadata?.order_id
    ? String(verified.metadata.order_id)
    : undefined;
  const metaOrderNumber = verified.metadata?.order_number
    ? String(verified.metadata.order_number)
    : undefined;

  const order = metaOrderId
    ? await OrderModel.findById(metaOrderId).lean()
    : input.expectedOrderNumber || metaOrderNumber
      ? await OrderModel.findOne({
          orderNumber: (input.expectedOrderNumber || metaOrderNumber)!.toUpperCase(),
        }).lean()
      : null;

  if (!order) {
    throw new AppError('Matching order not found for this transaction.', 404);
  }

  if (
    input.expectedOrderNumber &&
    order.orderNumber !== input.expectedOrderNumber.toUpperCase()
  ) {
    throw new AppError('Transaction does not match this order.', 400);
  }

  // Validate paid amount matches the authoritative order total in MongoDB.
  if (!Number.isFinite(verified.amount) || Math.abs(verified.amount - order.total) > 0.01) {
    throw new AppError('Verified payment amount does not match the order total.', 400);
  }

  // Idempotent return if this exact invoice already paid this order.
  if (order.paymentStatus === 'paid') {
    if (order.paymentReference === invoiceId) {
      return {
        verified: true,
        alreadyPaid: true,
        status: 'COMPLETED',
        orderNumber: order.orderNumber,
        paymentStatus: 'paid',
        message: 'Payment already verified.',
      };
    }
    throw new AppError('Order is already paid with a different transaction.', 409);
  }

  // Prevent replay of the same invoice/transaction ID on another order.
  const duplicateQuery = verified.transactionId
    ? {
        _id: { $ne: order._id },
        $or: [{ paymentReference: invoiceId }, { gatewayTransactionId: verified.transactionId }],
      }
    : {
        _id: { $ne: order._id },
        paymentReference: invoiceId,
      };
  const duplicate = await OrderModel.exists(duplicateQuery);
  if (duplicate) {
    throw new AppError('Duplicate transaction reference detected.', 409);
  }

  const now = new Date();
  const updated = await OrderModel.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'paid' } },
    {
      $set: {
        paymentMethod: 'paymently',
        paymentStatus: 'paid',
        paymentGateway: 'paymently',
        paymentReference: invoiceId,
        gatewayTransactionId: verified.transactionId ?? null,
        gatewayPaymentMethod: verified.paymentMethod ?? null,
        paidAt: now,
      },
      $push: {
        statusHistory: {
          status: order.status,
          note: `Online payment verified via Paymently (${verified.paymentMethod ?? 'Online'}, Ref: ${verified.transactionId ?? invoiceId})`,
          at: now,
          by: null,
        },
      },
    },
    { new: true },
  ).lean();

  if (!updated) {
    // Another concurrent request (e.g. webhook) just marked it paid.
    const latest = await OrderModel.findById(order._id, 'paymentStatus paymentReference').lean();
    if (latest?.paymentStatus === 'paid' && latest.paymentReference === invoiceId) {
      return {
        verified: true,
        alreadyPaid: true,
        status: 'COMPLETED',
        orderNumber: order.orderNumber,
        paymentStatus: 'paid',
        message: 'Payment already verified.',
      };
    }
    throw new AppError('Unable to update order payment status.', 409);
  }

  return {
    verified: true,
    status: 'COMPLETED',
    orderNumber: updated.orderNumber,
    paymentStatus: updated.paymentStatus,
    message: 'Payment verified successfully.',
  };
}
