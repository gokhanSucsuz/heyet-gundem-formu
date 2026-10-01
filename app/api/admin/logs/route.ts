import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AuditLogModel } from '@/models/AuditLog';
import { decryptData } from '@/lib/encryption';

// GET — list audit logs with pagination and filters
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const personnelId = searchParams.get('personnelId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    if (personnelId) {
      query.$or = [
        { personnelId: personnelId },
        { resourceId: personnelId }
      ];
    }
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const total = await AuditLogModel.countDocuments(query);
    const logs = await AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Decrypt details for display
    const decryptedLogs = logs.map((log: any) => ({
      ...log,
      details: log.details ? decryptData(log.details) || log.details : '',
      previousValue: log.previousValue ? decryptData(log.previousValue) : null,
    }));

    return NextResponse.json({
      logs: decryptedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
