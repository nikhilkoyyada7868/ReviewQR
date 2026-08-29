INSERT INTO restaurants (
  id, public_id, slug, display_name, location_label, google_review_url,
  approved_facts_json, status, created_at, updated_at
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'saffron-yard', 'Saffron Yard', 'Indiranagar, Bengaluru',
  'https://g.page/r/saffron-yard/review',
  '["Indian cuisine","Outdoor seating is available"]', 'active',
  1787941800000, 1787941800000
) ON CONFLICT(id) DO UPDATE SET
  display_name = excluded.display_name,
  location_label = excluded.location_label,
  google_review_url = excluded.google_review_url,
  approved_facts_json = excluded.approved_facts_json,
  status = excluded.status,
  updated_at = excluded.updated_at;

INSERT INTO topics (id, restaurant_id, label, prompt_descriptor, sort_order, active, created_at, updated_at) VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Food', 'food quality', 1, 1, 1787941800000, 1787941800000),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Service', 'service experience', 2, 1, 1787941800000, 1787941800000),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Ambience', 'ambience', 3, 1, 1787941800000, 1787941800000),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Value', 'value for money', 4, 1, 1787941800000, 1787941800000),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Cleanliness', 'cleanliness', 5, 1, 1787941800000, 1787941800000),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Family friendly', 'family-friendly atmosphere', 6, 1, 1787941800000, 1787941800000)
ON CONFLICT(id) DO UPDATE SET
  label = excluded.label,
  prompt_descriptor = excluded.prompt_descriptor,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = excluded.updated_at;
