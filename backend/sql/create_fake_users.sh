#!/usr/bin/env bash
# Creates 6 demo Supabase auth users and provisions their profiles through the
# real createProfile endpoint (POST /api/v1/profiles), then prints SQL to paste
# into the Supabase SQL Editor to backfill trips/points for them.
#
# Requires: curl, jq
# Requires env var: SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API -> service_role)
#   export SUPABASE_SERVICE_ROLE_KEY="..."
#   ./create_fake_users.sh

set -euo pipefail

SUPABASE_URL="https://tqefntzocdoudayuevpc.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_u0zN0s95Dq_5_ycNAoSvMg_BCTPevGp"
BACKEND_URL="https://hacknc2026-production.up.railway.app"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set SUPABASE_SERVICE_ROLE_KEY first (Supabase dashboard -> Project Settings -> API)." >&2
  exit 1
fi

# username | display name | password | total_points | level
USERS=(
  "ava_chen|Ava Chen|DemoPass123!|420|5"
  "liam_patel|Liam Patel|DemoPass123!|180|3"
  "maya_johnson|Maya Johnson|DemoPass123!|950|9"
  "noah_kim|Noah Kim|DemoPass123!|60|1"
  "sophia_garcia|Sophia Garcia|DemoPass123!|310|4"
  "ethan_wright|Ethan Wright|DemoPass123!|725|7"
)

PROFILE_SQL=""
TRIP_SQL=""
TXN_SQL=""

trip_block() {
  # args: id profile_id origin_lat origin_lng dest_lat dest_lng mode distance duration co2 baseline cost points_col points status created_offset completed_offset
  local id="$1" pid="$2" olat="$3" olng="$4" dlat="$5" dlng="$6" mode="$7" dist="$8" dur="$9"
  shift 9
  local co2="$1" baseline="$2" cost="$3" pointscol="$4" points="$5" status="$6" createdoff="$7" completedoff="$8"
  local pw="null" cw="null" dw="null"
  case "$pointscol" in
    walking) pw="$points" ;;
    cycling) cw="$points" ;;
    driving) dw="$points" ;;
  esac
  TRIP_SQL+="  ('$id', '$pid', $olat, $olng, $dlat, $dlng, '$mode', $dist, $dur, $co2, $baseline, $cost, 'USD', $pw, $cw, $dw, 'v1', '$status', now() - interval '$createdoff', now() - interval '$completedoff'),
"
  if [[ "$status" == "COMPLETED" ]]; then
    TXN_SQL+="  ('$(uuidgen | tr '[:upper:]' '[:lower:]')', '$pid', '$id', $points, 'trip:$id:completion', false, 'TRIP_COMPLETION', now() - interval '$completedoff'),
"
  fi
}

i=0
for row in "${USERS[@]}"; do
  i=$((i + 1))
  IFS='|' read -r username displayname password totalpoints level <<<"$row"
  email="${username}@example.com"

  echo "Creating auth user for $username ..." >&2
  create_resp=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true}")
  user_id=$(echo "$create_resp" | jq -r '.id // empty')
  if [[ -z "$user_id" ]]; then
    echo "Failed to create $email: $create_resp" >&2
    exit 1
  fi

  echo "Signing in as $username ..." >&2
  login_resp=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  access_token=$(echo "$login_resp" | jq -r '.access_token // empty')
  if [[ -z "$access_token" ]]; then
    echo "Failed to sign in as $email: $login_resp" >&2
    exit 1
  fi

  echo "Creating profile for $username via $BACKEND_URL/api/v1/profiles ..." >&2
  profile_resp=$(curl -sS -w '\n%{http_code}' -X POST "$BACKEND_URL/api/v1/profiles" \
    -H "Authorization: Bearer $access_token" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$username\",\"displayName\":\"$displayname\"}")
  http_code=$(echo "$profile_resp" | tail -n1)
  body=$(echo "$profile_resp" | sed '$d')
  if [[ "$http_code" != "201" ]]; then
    echo "createProfile failed for $username ($http_code): $body" >&2
    exit 1
  fi
  echo "  -> profile id $user_id" >&2

  PROFILE_SQL+="update public.profiles set total_points = $totalpoints, level = $level where id = '$user_id';
"

  # Two completed trips per user (cycling + walking) spaced out in time.
  cyc_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
  walk_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
  cyc_points=$(( totalpoints * 6 / 10 ))
  walk_points=$(( totalpoints - cyc_points ))
  trip_block "$cyc_id" "$user_id" 35.7847 -78.6821 35.7719 -78.6734 CYCLING 4200 1080 0.000 0.920 0.00 cycling "$cyc_points" COMPLETED "$((i + 10)) days" "$((i + 10)) days"
  trip_block "$walk_id" "$user_id" 35.7719 -78.6734 35.7806 -78.6589 WALKING 1800 1500 0.000 0.410 0.00 walking "$walk_points" COMPLETED "$i days" "$i days"
done

cat <<SQL

-- ==== Paste everything below into the Supabase SQL Editor ====

insert into public.trips (
  id, profile_id, origin_latitude, origin_longitude, destination_latitude, destination_longitude,
  mode, distance_meters, duration_seconds, estimated_co2_kg, baseline_co2_kg, estimated_cost, currency,
  walking_points, cycling_points, driving_points, emissions_methodology_version, status, created_at, completed_at
) values
${TRIP_SQL%,
}
;

insert into public.point_transactions (id, profile_id, trip_id, points, award_key, leaderboard_eligible, reason, created_at) values
${TXN_SQL%,
}
;

${PROFILE_SQL}
SQL
