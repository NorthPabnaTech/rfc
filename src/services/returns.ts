import 'server-only';

import { connectDB, OrderModel, ReturnRequestModel } from '@/database';
import type { Paginated, ReturnDTO } from '@/types';
import { isOwnCloudinaryAsset } from '@lib/cloudinary';
import {
  ADMIN_PAGE_SIZE,
  RETURN_STATUS_LABELS,
  RETURN_TRANSITIONS,
  RETURN_WINDOW_HOURS,
  type ReturnStatus,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import type { ImageAssetInput } from '@lib/validators/common';

import { toReturn } from './mappers';
import { withinReturnWindow } from './orders';

export async function createReturnRequest(
  userId: string,
  input: { orderId: string; reason: string; description?: string; images: ImageAssetInput[] },
): Promise<void> {
  await connectDB();
  if (input.images.some((i) => i.type !== 'cloudinary' || !isOwnCloudinaryAsset(i, 'returns'))) {
    throw new AppError('Please upload return photos using the upload button.');
  }
  const order = await OrderModel.findOne({ _id: input.orderId, user: userId }).lean();
  if (!order) throw new AppError('Order not found.', 404);
  if (!withinReturnWindow(order)) {
    throw new AppError(
      `Returns can only be requested within ${RETURN_WINDOW_HOURS / 24} days of delivery.`,
    );
  }
  if (await ReturnRequestModel.exists({ order: order._id })) {
    throw new AppError('A return has already been requested for this order.');
  }
  await ReturnRequestModel.create({
    order: order._id,
    orderNumber: order.orderNumber,
    user: userId,
    reason: input.reason,
    description: input.description,
    images: input.images,
  });
}

export async function listReturns(f: {
  status?: ReturnStatus;
  page?: number;
}): Promise<Paginated<ReturnDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query = f.status ? { status: f.status } : {};
  const [docs, total] = await Promise.all([
    ReturnRequestModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate('order', 'total customer')
      .populate('user', 'name')
      .lean(),
    ReturnRequestModel.countDocuments(query),
  ]);
  return {
    items: docs.map((d) => toReturn(d as never)),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function updateReturn(
  returnId: string,
  by: string,
  data: { status: ReturnStatus; adminNote?: string; refundAmount?: number },
): Promise<void> {
  await connectDB();
  const ret = await ReturnRequestModel.findById(returnId);
  if (!ret) throw new AppError('Return request not found.', 404);

  if (data.status !== ret.status && !RETURN_TRANSITIONS[ret.status].includes(data.status)) {
    throw new AppError(
      `Can't move a return from ${RETURN_STATUS_LABELS[ret.status]} to ${RETURN_STATUS_LABELS[data.status]}.`,
    );
  }
  const statusChanged = data.status !== ret.status;
  ret.status = data.status;
  if (data.adminNote !== undefined) ret.adminNote = data.adminNote;
  if (data.refundAmount !== undefined) ret.refundAmount = data.refundAmount;
  if (statusChanged && ['approved', 'rejected', 'refunded', 'closed'].includes(data.status)) {
    ret.resolvedAt = new Date();
    ret.resolvedBy = by as never;
  }
  await ret.save();

  // An approved return moves the order itself to "returned".
  if (statusChanged && data.status === 'approved') {
    await OrderModel.updateOne(
      { _id: ret.order },
      {
        $set: { status: 'returned' },
        $push: {
          statusHistory: {
            status: 'returned',
            note: `Return approved: ${ret.reason}`,
            at: new Date(),
            by,
          },
        },
      },
    );
  }
  if (statusChanged && data.status === 'refunded') {
    await OrderModel.updateOne({ _id: ret.order }, { $set: { paymentStatus: 'refunded' } });
  }
}
