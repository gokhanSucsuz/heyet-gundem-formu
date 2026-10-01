import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { PersonnelModel } from '@/models/Personnel';
import { hashPassword, verifyPassword, encryptData } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { currentPassword, newPassword } = await req.json();

    const personnelId = req.headers.get('x-personnel-id');
    const personnelName = req.headers.get('x-personnel-name') ? decodeURIComponent(req.headers.get('x-personnel-name')!) : 'Unknown';

    if (!personnelId) {
      return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 401 });
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mevcut şifre ve yeni şifre gerekli' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Yeni şifre en az 6 karakter olmalıdır' }, { status: 400 });
    }

    const personnel = await PersonnelModel.findById(personnelId);
    if (!personnel || !personnel.isActive) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, personnel.passwordHash);
    if (!valid) {
      await createAuditLog({
        personnelId,
        personnelName,
        action: 'UPDATE',
        resource: 'personnel',
        details: 'Başarısız şifre değiştirme denemesi — mevcut şifre yanlış',
        req,
      });
      return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    const newEncrypted = encryptData(newPassword);
    personnel.passwordHash = newHash;
    personnel.encryptedPassword = newEncrypted;
    await personnel.save();

    await createAuditLog({
      personnelId,
      personnelName,
      action: 'UPDATE',
      resource: 'personnel',
      details: 'Şifre başarıyla değiştirildi',
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
