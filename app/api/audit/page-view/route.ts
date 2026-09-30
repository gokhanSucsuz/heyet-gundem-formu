import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit';

// POST — log page views
export async function POST(req: NextRequest) {
  try {
    const { personnelId, personnelName, page, pageTitle } = await req.json();

    if (!personnelId || !page) {
      return NextResponse.json({ error: 'personnelId and page required' }, { status: 400 });
    }

    await createAuditLog({
      personnelId,
      personnelName: personnelName || 'Bilinmeyen',
      action: 'VIEW',
      resource: 'page',
      resourceId: page,
      details: `Sayfa görüntülendi: ${pageTitle || page}`,
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
