import { NextRequest } from "next/server";
import { mastermindSSEPOST, mastermindSSEGET } from "@/app/actions/mastermind-actions";

export async function GET(req: NextRequest) {
  return mastermindSSEGET(req);
}

export async function POST(req: NextRequest) {
  return mastermindSSEPOST(req);
}

// Enable streaming
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
