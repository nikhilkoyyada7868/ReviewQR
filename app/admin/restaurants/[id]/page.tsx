import type { Metadata } from "next";
import Link from "next/link";
import { RestaurantDetail } from "./restaurant-detail";

export const metadata: Metadata = { title: "Manage restaurant" };
export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="admin-main"><Link href="/admin" className="back-link">← Restaurants</Link><RestaurantDetail id={id} /></main>;
}
