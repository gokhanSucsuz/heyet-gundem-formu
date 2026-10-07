import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { SuperAdminModel } from '@/models/SuperAdmin';
import { hashPassword, verifyPassword } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';

const SUPER_ADMIN_EMAIL = 'gokhansucsuz@gmail.com';
const INITIAL_PASSWORD = '12345';


// Ensure super admin record exists
async function ensureSuperAdmin() {
  const existing = await SuperAdminModel.findById('super-admin');
  if (!existing) {
    const hash = await hashPassword(INITIAL_PASSWORD);
    await SuperAdminModel.create({
      _id: 'super-admin',
      email: SUPER_ADMIN_EMAIL,
      passwordHash: hash,
      mustChangePassword: true,
    });
  }
  return await SuperAdminModel.findById('super-admin');
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Şifre gerekli' }, { status: 400 });
    }

    const admin = await ensureSuperAdmin();

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      await createAuditLog({
        personnelId: 'super-admin',
        personnelName: 'Süper Admin',
        action: 'LOGIN',
        resource: 'session',
        details: 'Başarısız süper admin giriş denemesi — yanlış şifre',
        req,
      });
      return NextResponse.json({ error: 'Şifre yanlış' }, { status: 401 });
    }

    await createAuditLog({
      personnelId: 'super-admin',
      personnelName: 'Süper Admin',
      action: 'LOGIN',
      resource: 'session',
      details: 'Başarılı süper admin girişi',
      req,
    });

    return NextResponse.json({
      success: true,
      mustChangePassword: admin.mustChangePassword,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
