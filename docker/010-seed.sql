INSERT INTO rooms (name, capacity, color, amenities)
VALUES
  ('Doc', 12, '#5B6FE8', '["Large display", "Video conferencing", "Whiteboard"]'::jsonb),
  ('Grumpy', 8, '#EF6C63', '["Display", "Video conferencing", "Whiteboard"]'::jsonb),
  ('Happy', 6, '#F2B84B', '["Display", "Video conferencing"]'::jsonb),
  ('Sleepy', 6, '#8B72CC', '["Display", "Whiteboard"]'::jsonb),
  ('Bashful', 4, '#E882AE', '["Display", "Whiteboard"]'::jsonb),
  ('Sneezy', 3, '#4CAFC4', '["Display"]'::jsonb),
  ('Dopey', 2, '#64B982', '["Whiteboard"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  capacity = EXCLUDED.capacity,
  color = EXCLUDED.color,
  amenities = EXCLUDED.amenities,
  active = true,
  updated_at = now();
