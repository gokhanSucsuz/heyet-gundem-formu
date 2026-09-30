import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { MemberModel, FormModel, SettingsModel } from '@/models/EncryptedModels';
import { encryptData, decryptData } from '@/lib/encryption';
import { createAuditLog } from '@/lib/audit';

// POST — Migrate all existing data from legacy encryption to AES-256-GCM
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const results = {
      members: { total: 0, migrated: 0, failed: 0, errors: [] as string[] },
      forms: { total: 0, migrated: 0, failed: 0, errors: [] as string[] },
      settings: { total: 0, migrated: 0, failed: 0, errors: [] as string[] },
    };

    const collections = [
      { name: 'members' as const, model: MemberModel },
      { name: 'forms' as const, model: FormModel },
      { name: 'settings' as const, model: SettingsModel },
    ];

    for (const { name, model } of collections) {
      const docs = await model.find({});
      results[name].total = docs.length;

      for (const doc of docs) {
        try {
          // Try to decrypt with current method (handles both legacy and new)
          const decrypted = decryptData(doc.payload);
          if (decrypted === null) {
            results[name].failed++;
            results[name].errors.push(`ID ${doc._id}: Decrypt returned null`);
            continue;
          }

          // Re-encrypt with new AES-256-GCM
          const newPayload = encryptData(decrypted);

          // Verify the new encryption works
          const verification = decryptData(newPayload);
          if (verification === null) {
            results[name].failed++;
            results[name].errors.push(`ID ${doc._id}: Re-encryption verification failed`);
            continue;
          }

          // Update the document
          await model.findByIdAndUpdate(doc._id, {
            payload: newPayload,
            updatedAt: new Date(),
          });

          results[name].migrated++;
        } catch (err: any) {
          results[name].failed++;
          results[name].errors.push(`ID ${doc._id}: ${err.message}`);
        }
      }
    }

    await createAuditLog({
      personnelId: 'super-admin',
      personnelName: 'Süper Admin',
      action: 'UPDATE',
      resource: 'system',
      details: `Veri migrasyonu tamamlandı: Members(${results.members.migrated}/${results.members.total}), Forms(${results.forms.migrated}/${results.forms.total}), Settings(${results.settings.migrated}/${results.settings.total})`,
      req,
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalDocuments: results.members.total + results.forms.total + results.settings.total,
        totalMigrated: results.members.migrated + results.forms.migrated + results.settings.migrated,
        totalFailed: results.members.failed + results.forms.failed + results.settings.failed,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
