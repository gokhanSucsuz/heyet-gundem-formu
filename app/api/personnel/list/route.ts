import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { PersonnelModel } from '@/models/Personnel';

// GET — return list of active personnel names (for selection screen)
export async function GET() {
  try {
    await dbConnect();
    const personnel = await PersonnelModel.find({ isActive: true }, { _id: 1, name: 1 }).sort({ name: 1 });
    const list = personnel.map((p: any) => ({ id: p._id, name: p.name }));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
