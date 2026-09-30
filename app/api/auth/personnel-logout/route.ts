import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { personnelId, personnelName } = await req.json();

    if (personnelId && personnelName) {
      await createAuditLog({
        personnelId,
        personnelName,
        action: 'LOGOUT',
        resource: 'session',
        details: 'Personel çıkış yaptı',
        req,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
