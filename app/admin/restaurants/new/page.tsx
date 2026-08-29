import type { Metadata } from "next";
import Link from "next/link";
import { RestaurantForm } from "../restaurant-form";

export const metadata: Metadata = { title: "New restaurant" };
export default function NewRestaurantPage() {
  return <main className="admin-main admin-narrow"><Link href="/admin" className="back-link">← Restaurants</Link><div className="admin-title-row"><div><div className="eyebrow">Five-minute setup</div><h1>Onboard a restaurant</h1><p>Have the official Google review link ready. The QR destination stays permanent after setup.</p></div></div><RestaurantForm /></main>;
}
