import type { Metadata } from "next";
import Link from "next/link";
import { RestaurantList } from "./restaurant-list";

export const metadata: Metadata = { title: "Restaurants" };

export default function AdminPage() {
  return <main className="admin-main"><div className="admin-title-row"><div><div className="eyebrow">Internal workspace</div><h1>Restaurants</h1><p>Onboard locations, manage QR destinations, and review measured handoffs.</p></div><Link className="button button-primary" href="/admin/restaurants/new"><span aria-hidden="true">＋</span> New restaurant</Link></div><RestaurantList /></main>;
}
