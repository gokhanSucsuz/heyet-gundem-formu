import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { FormModel } from '@/models/EncryptedModels';
import { decryptData, getKeyInfo } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

// Auth-protected by middleware. Reports key fingerprint and whether stored forms decrypt.
export async function GET() {
  try {
    await dbConnect();
    const docs = await FormModel.find({}).select('payload').lean();
    const ok = docs.filter((d: any) => decryptData(d.payload) !== null).length;

    return NextResponse.json(
      { key: getKeyInfo(), forms: { total: docs.length, decrypted: ok } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json({ key: getKeyInfo(), error: error.message }, { status: 500 });
  }
}
