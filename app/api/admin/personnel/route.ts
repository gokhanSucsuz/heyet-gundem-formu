import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { PersonnelModel } from '@/models/Personnel';
import { hashPassword, encryptData, decryptData } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';

// GET — list all personnel (admin only)
export async function GET() {
  try {
    await dbConnect();
    const personnel = await PersonnelModel.find({}).sort({ createdAt: -1 });
    const list = personnel.map((p: any) => ({
      id: p._id,
      name: p.name,
      isActive: p.isActive,
      isAdmin: p.isAdmin || false,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      passwordPlain: p.encryptedPassword ? decryptData(p.encryptedPassword) : 'Gizli (Eski Şifre)',
    }));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create new personnel
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { name, password, isAdmin } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'İsim ve şifre gerekli' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Şifre en az 4 karakter olmalı' }, { status: 400 });
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(password);
    const encryptedPassword = encryptData(password);

    await PersonnelModel.create({
      _id: id,
      name,
      passwordHash,
      encryptedPassword,
      isAdmin: isAdmin || false,
      isActive: true,
      createdBy: 'super-admin',
    });

    await createAuditLog({
      personnelId: 'super-admin',
      personnelName: 'Süper Admin',
      action: 'CREATE',
      resource: 'personnel',
      resourceId: id,
      details: `Yeni personel eklendi: ${name}`,
      req,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — deactivate personnel
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const personnel = await PersonnelModel.findById(id);
    if (!personnel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    await PersonnelModel.findByIdAndUpdate(id, { isActive: false });

    await createAuditLog({
      personnelId: 'super-admin',
      personnelName: 'Süper Admin',
      action: 'DELETE',
      resource: 'personnel',
      resourceId: id,
      details: `Personel devre dışı bırakıldı: ${personnel.name}`,
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT — update personnel (reactivate or change password)
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { id, name, password, isActive, isAdmin } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    if (password) {
      updates.passwordHash = await hashPassword(password);
      updates.encryptedPassword = encryptData(password);
    }

    await PersonnelModel.findByIdAndUpdate(id, updates);

    await createAuditLog({
      personnelId: 'super-admin',
      personnelName: 'Süper Admin',
      action: 'UPDATE',
      resource: 'personnel',
      resourceId: id,
      details: `Personel güncellendi: ${name || id}${password ? ' (şifre değiştirildi)' : ''}`,
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
