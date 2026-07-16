import { NextResponse } from "next/server";
import {
  getActivePromotions,
  getEventFoodOptions,
  getEventProgram,
  getEventServices,
  getEventTickets,
  getEventTransport,
  getEventZones,
  getLiveStatus,
} from "@/lib/data/hub-tools";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requests = await Promise.allSettled([
    getEventProgram({ event: id, limit: 100 }),
    getEventZones({ event: id }),
    getEventFoodOptions({ event: id, availableOnly: false, limit: 50 }),
    getActivePromotions({ event: id }),
    getEventServices({ event: id }),
    getEventTransport({ event: id }),
    getLiveStatus({ event: id }),
    getEventTickets({ event: id }),
  ]);
  const value = <T,>(index: number): T[] => requests[index].status === "fulfilled" ? (requests[index].value.data as T[]) : [];
  return NextResponse.json({
    program: value(0), zones: value(1), food: value(2), promotions: value(3),
    services: value(4), transport: value(5), live: value(6), tickets: value(7),
  });
}
