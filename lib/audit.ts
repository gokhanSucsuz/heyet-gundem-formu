import { NextRequest } from 'next/server';
import dbConnect from './mongodb';
import { AuditLogModel } from '@/models/AuditLog';
import { encryptData } from './encryption';

interface LogEntry {
  personnelId: string;
  personnelName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT' | 'LOCK' | 'UNLOCK' | 'EXPORT' | 'IMPORT';
  resource: 'form' | 'member' | 'settings' | 'personnel' | 'page' | 'session' | 'system';
  resourceId?: string;
  details?: string;
  previousValue?: any;
  req?: NextRequest;
}

export async function createAuditLog(entry: LogEntry): Promise<void> {
  try {
    await dbConnect();

    const logDoc: any = {
      personnelId: entry.personnelId,
      personnelName: entry.personnelName,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || null,
      details: entry.details ? encryptData(entry.details) : '',
      previousValue: entry.previousValue ? encryptData(entry.previousValue) : null,
      timestamp: new Date(),
    };

    if (entry.req) {
      logDoc.ipAddress = entry.req.headers.get('x-forwarded-for') ||
                         entry.req.headers.get('x-real-ip') ||
                         'unknown';
      logDoc.userAgent = entry.req.headers.get('user-agent') || 'unknown';
    }

    await AuditLogModel.create(logDoc);
  } catch (error) {
    console.error('[AuditLog] Failed to create log entry:', error);
    // Don't throw — logging should never break the main operation
  }
}
