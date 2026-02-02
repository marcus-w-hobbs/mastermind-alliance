import { NextRequest } from "next/server";
import { backroomsSSEPOST, backroomsSSEGET } from "@/app/actions/backrooms-actions";

export async function GET(req: NextRequest) {
  return backroomsSSEGET(req);
}

export async function POST(req: NextRequest) {
  return backroomsSSEPOST(req);
}

// Enable streaming
export const dynamic = "force-dynamic";
export const runtime = "edge";