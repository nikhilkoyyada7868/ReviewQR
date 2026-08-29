import type { Metadata } from "next";
import { ReviewFlow } from "./review-flow";

export const metadata: Metadata = { title: "Share your experience" };

export default async function RestaurantReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ReviewFlow slug={slug} />;
}
