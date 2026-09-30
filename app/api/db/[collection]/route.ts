import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { MemberModel, FormModel, SettingsModel } from '@/models/EncryptedModels';
import { encryptData, decryptData } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';

const models: any = {
  members: MemberModel,
  forms: FormModel,
  settings: SettingsModel
};

function getPersonnelFromHeaders(req: NextRequest) {
  const personnelId = req.headers.get('x-personnel-id') || 'unknown';
  const personnelName = req.headers.get('x-personnel-name') || 'Bilinmeyen';
  return { personnelId, personnelName };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    await dbConnect();
    const { collection } = await params;
    const model = models[collection];
    if (!model) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      const doc = await model.findById(id);
      if (!doc) return NextResponse.json(null);
      const decrypted = decryptData(doc.payload);
      const base = { id: doc._id.toString(), _id: doc._id };
      
      let data: any;
      if (collection === 'forms') {
        data = { items: [], signatureMembers: [], headerTop: '', headerLine4: '', footerText: '', title: 'İsimsiz Form', layout: {}, ...decrypted, ...base };
      } else if (collection === 'members') {
        data = { name: 'İsimsiz Üye', title: '', order: 0, ...decrypted, ...base };
      } else if (collection === 'settings') {
        data = { layout: {}, ...decrypted, ...base };
      } else {
        data = { ...(decrypted || {}), ...base };
      }

      // Log page view if not a silent request
      if (!searchParams.get('silent')) {
        const { personnelId, personnelName } = getPersonnelFromHeaders(req);
        if (personnelId !== 'unknown') {
          await createAuditLog({
            personnelId,
            personnelName,
            action: 'VIEW',
            resource: collection as any,
            resourceId: id,
            details: `${collection} görüntülendi: ${id}`,
            req,
          });
        }
      }

      return NextResponse.json(data);
    }

    const docs = await model.find({});
    const decryptedDocs = docs.map((doc: any) => {
      const decrypted = decryptData(doc.payload);
      const base = { id: doc._id.toString(), _id: doc._id };
      
      if (collection === 'forms') {
        return { items: [], signatureMembers: [], headerTop: '', headerLine4: '', footerText: '', title: 'İsimsiz Form', layout: {}, ...decrypted, ...base };
      }
      if (collection === 'members') {
        return { name: 'İsimsiz Üye', title: '', order: 0, ...decrypted, ...base };
      }
      if (collection === 'settings') {
        return { layout: {}, ...decrypted, ...base };
      }
      return { ...(decrypted || {}), ...base };
    });
    
    return NextResponse.json(decryptedDocs);
  } catch (error: any) {
    console.error('API GET ERROR:', error);
    return NextResponse.json({ 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: !process.env.MONGODB_URI ? 'MONGODB_URI is missing' : 'Check IP whitelist on MongoDB Atlas'
    }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    await dbConnect();
    const { collection } = await params;
    const model = models[collection];
    if (!model) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });

    const data = await req.json();
    const id = data.id || data._id;
    const isSilent = req.nextUrl.searchParams.get('silent') === 'true';
    
    // Check for conflicts (optimistic locking)
    const existing = await model.findById(id);
    let isNew = !existing;

    const payload = encryptData(data);
    
    await model.findByIdAndUpdate(
      id,
      { payload, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // Audit log
    if (!isSilent) {
      const { personnelId, personnelName } = getPersonnelFromHeaders(req);
      if (personnelId !== 'unknown') {
        const previousValue = existing ? decryptData(existing.payload) : null;
        await createAuditLog({
          personnelId,
          personnelName,
          action: isNew ? 'CREATE' : 'UPDATE',
          resource: collection as any,
          resourceId: id,
          details: `${collection} ${isNew ? 'oluşturuldu' : 'güncellendi'}: ${id}`,
          previousValue,
          req,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    await dbConnect();
    const { collection } = await params;
    const model = models[collection];
    const id = req.nextUrl.searchParams.get('id');
    const isSilent = req.nextUrl.searchParams.get('silent') === 'true';
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Get the document before deleting (for audit log)
    const existing = await model.findById(id);
    
    await model.findByIdAndDelete(id);

    // Audit log
    if (!isSilent) {
      const { personnelId, personnelName } = getPersonnelFromHeaders(req);
      if (personnelId !== 'unknown') {
        const previousValue = existing ? decryptData(existing.payload) : null;
        await createAuditLog({
          personnelId,
          personnelName,
          action: 'DELETE',
          resource: collection as any,
          resourceId: id,
          details: `${collection} silindi: ${id}`,
          previousValue,
          req,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
