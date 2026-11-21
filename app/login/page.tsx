import dbConnect from '@/lib/mongodb';
import { SettingsModel } from '@/models/EncryptedModels';
import { decryptData } from '@/lib/encryption';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

async function getGoogleLoginSetting() {
  try {
    await dbConnect();
    const settings = (await SettingsModel.findById('default')) || (await SettingsModel.findOne({}));
    if (!settings) return false;
    const decrypted = decryptData(settings.payload);
    return decrypted?.isGoogleLoginEnabled ?? false;
  } catch (e) {
    console.error("Error reading settings on login page:", e);
    return false;
  }
}

export default async function LoginPage() {
  const isGoogleLoginEnabled = await getGoogleLoginSetting();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle GovTech Background Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.28) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <LoginClient isGoogleLoginEnabled={isGoogleLoginEnabled} />
    </div>
  );
}
