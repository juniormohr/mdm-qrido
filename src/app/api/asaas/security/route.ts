import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // O Asaas usa essa rota via POST para perguntar se aprovamos a transferência/saque.
  // Como não fazemos saques automáticos por API, aprovamos todos para não travar a conta.
  console.log('[ASAAS Security] Recebido webhook de validação.');
  return NextResponse.json({ status: 'APPROVED' }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ message: 'Rotas de segurança do Asaas ativas.' }, { status: 200 });
}
