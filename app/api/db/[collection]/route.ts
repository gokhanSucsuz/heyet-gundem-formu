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

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      });
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
    
    return NextResponse.json(decryptedDocs, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    console.error('API GET ERROR:', error);
    return NextResponse.json({ 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: !process.env.MONGODB_URI ? 'MONGODB_URI is missing' : 'Check IP whitelist on MongoDB Atlas',
      keyLen: process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0,
      saltLen: process.env.ENCRYPTION_SALT ? process.env.ENCRYPTION_SALT.length : 0
    }, { status: 500 });
  }
}

function generateUpdateDetails(collection: string, id: string, oldData: any, newData: any): string {
  if (!oldData) return `${collection} güncellendi: ${id}`;
  
  if (collection === 'forms') {
    const changes: string[] = [];
    
    // Check title
    if (oldData.title !== newData.title) {
      changes.push(`Başlık: "${newData.title}"`);
    }
    
    // Check items
    const oldItems = oldData.items || [];
    const newItems = newData.items || [];
    
    for (const newItem of newItems) {
      const oldItem = oldItems.find((i: any) => i.id === newItem.id);
      if (!oldItem) {
        changes.push(`Yeni madde: "${(newItem.text || '').substring(0, 50)}"`);
      } else if (oldItem.text !== newItem.text) {
        changes.push(`Madde değişti: "${(newItem.text || '').substring(0, 100)}"`);
      }
    }
    for (const oldItem of oldItems) {
       const newItem = newItems.find((i: any) => i.id === oldItem.id);
       if (!newItem) {
         changes.push(`Madde silindi: "${(oldItem.text || '').substring(0, 50)}"`);
       }
    }

    if (oldData.isLocked !== newData.isLocked) {
      changes.push(newData.isLocked ? 'Form kilitlendi' : 'Form kilidi açıldı');
    }

    if (changes.length > 0) {
      const diff = changes.join(' | ');
      return diff.length > 300 ? diff.substring(0, 300) + '...' : diff;
    }
  } else if (collection === 'members') {
    if (oldData.name !== newData.name) return `Üye ismi: "${newData.name}"`;
  }
  
  return `${collection} güncellendi: ${id}`;
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
        
        let detailsText = `${collection} ${isNew ? 'oluşturuldu' : 'güncellendi'}: ${id}`;
        if (!isNew && previousValue) {
          detailsText = generateUpdateDetails(collection, id, previousValue, data);
        }

        await createAuditLog({
          personnelId,
          personnelName,
          action: isNew ? 'CREATE' : 'UPDATE',
          resource: collection as any,
          resourceId: id,
          details: detailsText,
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
