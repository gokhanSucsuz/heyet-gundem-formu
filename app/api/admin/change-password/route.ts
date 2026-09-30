import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { SuperAdminModel } from '@/models/SuperAdmin';
import { hashPassword, verifyPassword } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mevcut ve yeni şifre gerekli' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Yeni şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    const admin = await SuperAdminModel.findById('super-admin');
    if (!admin) {
      return NextResponse.json({ error: 'Admin bulunamadı' }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await SuperAdminModel.findByIdAndUpdate('super-admin', {
      passwordHash: newHash,
      mustChangePassword: false,
    });

    await createAuditLog({
      personnelId: 'super-admin',
      personnelName: 'Süper Admin',
      action: 'UPDATE',
      resource: 'system',
      details: 'Süper admin şifresi değiştirildi',
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
