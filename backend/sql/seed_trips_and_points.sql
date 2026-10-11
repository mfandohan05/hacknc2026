gi-- Run in the Supabase SQL Editor AFTER the 6 demo profiles already exist
-- (created via create_fake_users.sh, which hits the real createProfile endpoint).
-- Backfills trips + point_transactions and sets each profile's total_points/level,
-- since createProfile always starts a user at 0 points / level 1.

insert into public.trips (
  id, profile_id, origin_latitude, origin_longitude, destination_latitude, destination_longitude,
  mode, distance_meters, duration_seconds, estimated_co2_kg, baseline_co2_kg, estimated_cost, currency,
  walking_points, cycling_points, driving_points, emissions_methodology_version, status, created_at, completed_at
) values
  ('a1111111-1111-4111-8111-111111111111', (select id from public.profiles where username = 'ava_chen'),     35.7847, -78.6821, 35.7719, -78.6734, 'CYCLING', 4200, 1080, 0.000, 0.920, 0.00, 'USD', null, 252, null, 'v1', 'COMPLETED', now() - interval '10 days', now() - interval '10 days' + interval '18 minutes'),
  ('a1111112-1111-4111-8111-111111111111', (select id from public.profiles where username = 'ava_chen'),     35.7719, -78.6734, 35.7806, -78.6589, 'WALKING', 1800, 1500, 0.000, 0.410, 0.00, 'USD', 168, null, null, 'v1', 'COMPLETED', now() - interval '3 days',  now() - interval '3 days' + interval '25 minutes'),

  ('a2222221-2222-4222-8222-222222222222', (select id from public.profiles where username = 'liam_patel'),   35.9049, -79.0469, 35.8989, -79.0486, 'CYCLING', 2600,  720, 0.000, 0.560, 0.00, 'USD', null, 108, null, 'v1', 'COMPLETED', now() - interval '12 days', now() - interval '12 days' + interval '12 minutes'),
  ('a2222222-2222-4222-8222-222222222222', (select id from public.profiles where username = 'liam_patel'),   35.8989, -79.0486, 35.9101, -79.0558, 'WALKING', 1200,  960, 0.000, 0.270, 0.00, 'USD', 72, null, null, 'v1', 'COMPLETED', now() - interval '2 days',  now() - interval '2 days' + interval '16 minutes'),

  ('a3333331-3333-4333-8333-333333333333', (select id from public.profiles where username = 'maya_johnson'), 36.0014, -78.9382, 35.9940, -78.8986, 'CYCLING', 8600, 2100, 0.000, 1.840, 0.00, 'USD', null, 570, null, 'v1', 'COMPLETED', now() - interval '20 days', now() - interval '20 days' + interval '35 minutes'),
  ('a3333332-3333-4333-8333-333333333333', (select id from public.profiles where username = 'maya_johnson'), 35.9940, -78.8986, 36.0014, -78.9382, 'WALKING', 3900, 3300, 0.000, 0.880, 0.00, 'USD', 380, null, null, 'v1', 'COMPLETED', now() - interval '6 days',  now() - interval '6 days' + interval '55 minutes'),

  ('a4444441-4444-4444-8444-444444444444', (select id from public.profiles where username = 'noah_kim'),      35.7796, -78.6382, 35.7730, -78.6418, 'CYCLING',  1400,  360, 0.000, 0.300, 0.00, 'USD', null, 36, null, 'v1', 'COMPLETED', now() - interval '4 days', now() - interval '4 days' + interval '6 minutes'),
  ('a4444442-4444-4444-8444-444444444444', (select id from public.profiles where username = 'noah_kim'),      35.7730, -78.6418, 35.7812, -78.6456, 'WALKING',   900,  720, 0.000, 0.200, 0.00, 'USD', 24, null, null, 'v1', 'COMPLETED', now() - interval '1 days', now() - interval '1 days' + interval '12 minutes'),

  ('a5555551-5555-4555-8555-555555555555', (select id from public.profiles where username = 'sophia_garcia'),35.2271, -80.8431, 35.2098, -80.8302, 'CYCLING', 5200, 1320, 0.000, 1.110, 0.00, 'USD', null, 186, null, 'v1', 'COMPLETED', now() - interval '15 days', now() - interval '15 days' + interval '22 minutes'),
  ('a5555552-5555-4555-8555-555555555555', (select id from public.profiles where username = 'sophia_garcia'),35.2098, -80.8302, 35.2213, -80.8389, 'WALKING', 2100, 1740, 0.000, 0.470, 0.00, 'USD', 124, null, null, 'v1', 'COMPLETED', now() - interval '5 days',  now() - interval '5 days' + interval '29 minutes'),

  ('a6666661-6666-4666-8666-666666666666', (select id from public.profiles where username = 'ethan_wright'), 36.0726, -79.7920, 36.0661, -79.8048, 'CYCLING', 6800, 1680, 0.000, 1.450, 0.00, 'USD', null, 435, null, 'v1', 'COMPLETED', now() - interval '25 days', now() - interval '25 days' + interval '28 minutes'),
  ('a6666662-6666-4666-8666-666666666666', (select id from public.profiles where username = 'ethan_wright'), 36.0661, -79.8048, 36.0789, -79.8120, 'WALKING', 3400, 2880, 0.000, 0.760, 0.00, 'USD', 290, null, null, 'v1', 'COMPLETED', now() - interval '8 days',  now() - interval '8 days' + interval '48 minutes');

insert into public.point_transactions (id, profile_id, trip_id, points, award_key, leaderboard_eligible, reason, created_at) values
  (gen_random_uuid(), (select id from public.profiles where username = 'ava_chen'),     'a1111111-1111-4111-8111-111111111111', 252, 'trip:a1111111-1111-4111-8111-111111111111:completion', false, 'TRIP_COMPLETION', now() - interval '10 days'),
  (gen_random_uuid(), (select id from public.profiles where username = 'ava_chen'),     'a1111112-1111-4111-8111-111111111111', 168, 'trip:a1111112-1111-4111-8111-111111111111:completion', false, 'TRIP_COMPLETION', now() - interval '3 days'),

  (gen_random_uuid(), (select id from public.profiles where username = 'liam_patel'),   'a2222221-2222-4222-8222-222222222222', 108, 'trip:a2222221-2222-4222-8222-222222222222:completion', false, 'TRIP_COMPLETION', now() - interval '12 days'),
  (gen_random_uuid(), (select id from public.profiles where username = 'liam_patel'),   'a2222222-2222-4222-8222-222222222222', 72,  'trip:a2222222-2222-4222-8222-222222222222:completion', false, 'TRIP_COMPLETION', now() - interval '2 days'),

  (gen_random_uuid(), (select id from public.profiles where username = 'maya_johnson'), 'a3333331-3333-4333-8333-333333333333', 570, 'trip:a3333331-3333-4333-8333-333333333333:completion', false, 'TRIP_COMPLETION', now() - interval '20 days'),
  (gen_random_uuid(), (select id from public.profiles where username = 'maya_johnson'), 'a3333332-3333-4333-8333-333333333333', 380, 'trip:a3333332-3333-4333-8333-333333333333:completion', false, 'TRIP_COMPLETION', now() - interval '6 days'),

  (gen_random_uuid(), (select id from public.profiles where username = 'noah_kim'),      'a4444441-4444-4444-8444-444444444444', 36, 'trip:a4444441-4444-4444-8444-444444444444:completion', false, 'TRIP_COMPLETION', now() - interval '4 days'),
  (gen_random_uuid(), (select id from public.profiles where username = 'noah_kim'),      'a4444442-4444-4444-8444-444444444444', 24, 'trip:a4444442-4444-4444-8444-444444444444:completion', false, 'TRIP_COMPLETION', now() - interval '1 days'),

  (gen_random_uuid(), (select id from public.profiles where username = 'sophia_garcia'),'a5555551-5555-4555-8555-555555555555', 186, 'trip:a5555551-5555-4555-8555-555555555555:completion', false, 'TRIP_COMPLETION', now() - interval '15 days'),
  (gen_random_uuid(), (select id from public.profiles where username = 'sophia_garcia'),'a5555552-5555-4555-8555-555555555555', 124, 'trip:a5555552-5555-4555-8555-555555555555:completion', false, 'TRIP_COMPLETION', now() - interval '5 days'),

  (gen_random_uuid(), (select id from public.profiles where username = 'ethan_wright'), 'a6666661-6666-4666-8666-666666666666', 435, 'trip:a6666661-6666-4666-8666-666666666666:completion', false, 'TRIP_COMPLETION', now() - interval '25 days'),
  (gen_random_uuid(), (select id from public.profiles where username = 'ethan_wright'), 'a6666662-6666-4666-8666-666666666666', 290, 'trip:a6666662-6666-4666-8666-666666666666:completion', false, 'TRIP_COMPLETION', now() - interval '8 days');

update public.profiles set total_points = 420, level = 5 where username = 'ava_chen';
update public.profiles set total_points = 180, level = 3 where username = 'liam_patel';
update public.profiles set total_points = 950, level = 9 where username = 'maya_johnson';
update public.profiles set total_points = 60,  level = 1 where username = 'noah_kim';
update public.profiles set total_points = 310, level = 4 where username = 'sophia_garcia';
update public.profiles set total_points = 725, level = 7 where username = 'ethan_wright';
