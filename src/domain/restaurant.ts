export type RestaurantStatus = "active" | "inactive";

export interface PublicTopic {
  id: string;
  label: string;
  promptDescriptor: string;
  sortOrder: number;
}

export interface PublicRestaurant {
  publicId: string;
  slug: string;
  displayName: string;
  locationLabel: string;
  topics: readonly PublicTopic[];
}

export interface RestaurantRecord extends PublicRestaurant {
  id: string;
  googleReviewUrl: string;
  approvedFacts: readonly string[];
  status: RestaurantStatus;
  createdAt: number;
  updatedAt: number;
}
