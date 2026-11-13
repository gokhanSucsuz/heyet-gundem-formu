import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { FormModel } from '@/models/EncryptedModels';
import { decryptData, getKeyInfo } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const docs = await FormModel.find({}).lean();

    const sampleDetails = docs.slice(0, 5).map((d: any) => {
      const payloadStr = typeof d.payload === 'string' ? d.payload : '';
      const dec = d.payload ? decryptData(d.payload) : null;
      return {
        id: String(d._id),
        hasPayload: !!d.payload,
        payloadLen: payloadStr.length,
        payloadStart: payloadStr.slice(0, 30),
        decrypted: dec !== null,
        decryptedTitle: dec?.title || d.title || null,
        directFields: Object.keys(d).filter((k) => k !== 'payload'),
      };
    });

    const ok = docs.filter((d: any) => {
      const dec = d.payload ? decryptData(d.payload) : null;
      return dec !== null || !!d.title;
    }).length;

    return NextResponse.json(
      {
        version: 'resilient-v3',
        key: getKeyInfo(),
        forms: { total: docs.length, decrypted: ok },
        sampleDetails,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json({ key: getKeyInfo(), error: error.message }, { status: 500 });
  }
}
