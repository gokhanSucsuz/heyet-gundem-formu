import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { PersonnelModel } from '@/models/Personnel';
import { verifyPassword } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { personnelId, password } = await req.json();

    if (!personnelId || !password) {
      return NextResponse.json({ error: 'Personel ve şifre gerekli' }, { status: 400 });
    }

    const personnel = await PersonnelModel.findById(personnelId);
    if (!personnel || !personnel.isActive) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    const valid = await verifyPassword(password, personnel.passwordHash);
    if (!valid) {
      await createAuditLog({
        personnelId: personnelId,
        personnelName: personnel.name,
        action: 'LOGIN',
        resource: 'session',
        details: 'Başarısız giriş denemesi — yanlış şifre',
        req,
      });
      return NextResponse.json({ error: 'Şifre yanlış' }, { status: 401 });
    }

    // Log successful login
    await createAuditLog({
      personnelId: personnelId,
      personnelName: personnel.name,
      action: 'LOGIN',
      resource: 'session',
      details: 'Başarılı personel girişi',
      req,
    });

    return NextResponse.json({
      success: true,
      personnel: {
        id: personnel._id,
        name: personnel.name,
        isAdmin: personnel.isAdmin || false,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
