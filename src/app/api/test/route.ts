import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API is working', timestamp: new Date().toISOString() });
}

export async function POST() {
  return NextResponse.json({ message: 'POST API is working', timestamp: new Date().toISOString() });
} 