import dbConnect from '@/lib/mongodb';
import { SettingsModel } from '@/models/EncryptedModels';
import { decryptData } from '@/lib/encryption';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

async function getGoogleLoginSetting() {
  try {
    await dbConnect();
    const settings = await SettingsModel.findOne({});
    if (!settings) return false; // Default to false (closed)
    const decrypted = decryptData(settings.payload);
    return decrypted?.isGoogleLoginEnabled ?? false;
  } catch (e) {
    console.error("Error reading settings on login page:", e);
    return false; // Default to false
  }
}

export default async function LoginPage() {
  const isGoogleLoginEnabled = await getGoogleLoginSetting();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4">
      <LoginClient isGoogleLoginEnabled={isGoogleLoginEnabled} />
    </div>
  );
}
