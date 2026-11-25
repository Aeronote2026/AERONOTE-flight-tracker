-- =====================================================================
-- AERONOTE · Migration 0001 · Logbook foundation (revision 6)
--
-- Reference: EASA Easy Access Rules for Aircrew (Regulation (EU)
-- No 1178/2011), consolidated November 2026 — FCL.010 definitions and
-- AMC1 FCL.050 (ED Decision 2025/002/R; logbook layout 2025/022/R).
-- Scope: aeroplanes.
--
-- Tables : pilots, aircraft, flights, fstd_sessions, opening_balances
-- Views  : flight_log, fstd_log, logbook_totals
--
-- DURATIONS: every *_minutes column is a whole number of minutes. The
--   app never shows raw numbers; it always displays HH:MM (90 -> 01:30).
--   A single flight or FSTD session is 00:01–24:00; totals are unlimited.
--
-- TIMES: every *_at column is an exact instant (timestamptz) in UTC,
--   recorded to the whole minute. Local Spanish time is only calculated
--   for display, using the IANA zone "Europe/Madrid" (CET/CEST aware).
--
-- SIGNATURES: this version records NAMES only. Nothing in this schema
--   represents a signature or certification (see section 4 notes).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Private schema for helper functions (not reachable via the API).
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Rejects time zone names PostgreSQL does not know (e.g. typos).
create or replace function private.validate_display_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names
                 where name = new.display_timezone) then
    raise exception 'Unknown time zone: %', new.display_timezone
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Copies the aircraft's engine class onto the flight, so users never
-- type it. Runs with the user's own rights: it can only read the user's
-- own aircraft (RLS). The foreign key below double-checks the result.
create or replace function private.fill_aircraft_engine_class()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select a.engine_class into new.aircraft_engine_class
  from public.aircraft a
  where a.id = new.aircraft_id and a.pilot_id = new.pilot_id;
  return new;
end;
$$;

-- Fixes the opening-balance cutoff when the balance is saved: the basis
-- (UTC or local date) defaults to the pilot's preference AT THAT MOMENT,
-- and the time zone used is frozen with it. Later preference changes
-- never move the cutoff.
--   * Editing as_of_date keeps the frozen zone (cutoff_at is recomputed
--     from the new date in the SAME zone).
--   * Changing cutoff_basis is the only edit that picks a zone again:
--     'utc' -> UTC; 'local' -> the pilot's display zone at that moment.
--   * Editing notes or totals never touches the cutoff.
create or replace function private.set_opening_balance_cutoff()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pref text;
  tz   text;
begin
  select p.logbook_date_basis::text, p.display_timezone into pref, tz
  from public.pilots p where p.id = new.pilot_id;

  if tg_op = 'INSERT' and new.cutoff_basis is null then
    new.cutoff_basis := pref::public.logbook_date_basis;
  end if;
  if tg_op = 'INSERT' or new.cutoff_basis is distinct from old.cutoff_basis then
    new.cutoff_timezone := case when new.cutoff_basis = 'local' then tz else 'UTC' end;
  else
    new.cutoff_timezone := old.cutoff_timezone;   -- frozen
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------
-- Physical property of the aircraft.
create type public.engine_class as enum ('SE', 'ME');

-- Minimum crew in the aircraft's TYPE CERTIFICATE. Information only:
-- it never decides how a flight is classified.
create type public.certified_crew as enum ('single_pilot', 'multi_pilot');

-- How the flight was ACTUALLY operated (AMC1 FCL.050 notes (i)(3)).
--   SP = single-pilot, MP = multi-pilot,
--   SP_MP = combination (e.g. skill test, notes (i)(10)(v)(C)).
create type public.operation_type as enum ('SP', 'MP', 'SP_MP');

-- Why the logged flight time differs from the recorded departure-to-
-- arrival interval.
create type public.duration_difference_reason as enum
  ('series_of_flights',   -- AMC1 notes (f): several flights as one entry
   'other');              -- must be explained in duration_difference_note

-- Which calendar date the pilot uses as the logbook "Date" column.
create type public.logbook_date_basis as enum ('utc', 'local');

-- FSTD categories for aeroplanes (FCL.010 definition (20)(a)).
create type public.fstd_category as enum
  ('FFS', 'FTD', 'FNPT_I', 'FNPT_II', 'FNPT_II_MCC', 'BITD');

-- FSTD instruction (AMC1 (a)(3)(ii)): the pilot's part in the session.
--   instruction_received  you received instruction (trainee)
--   instruction_given     you gave instruction (FI / SFI / TRI ...)
--   check_taken           you were the candidate in a skill test,
--                         proficiency check or operator check
--   examination_conducted you conducted the test/check as examiner
--   no_instruction        session without instruction or check
create type public.fstd_instruction as enum
  ('instruction_received', 'instruction_given', 'check_taken',
   'examination_conducted', 'no_instruction');


-- ---------------------------------------------------------------------
-- 2. PILOTS – one profile per Supabase Auth user (AMC1 (a)(1)).
-- ---------------------------------------------------------------------
create table public.pilots (
  id                  uuid primary key
                      references auth.users (id) on delete cascade,
  full_name           text not null default ''
                      check (char_length(full_name) <= 100),
  postal_address      text not null default ''
                      check (char_length(postal_address) <= 300),
  licence_number      text
                      check (char_length(licence_number) <= 50),
  home_aerodrome      text
                      check (home_aerodrome ~ '^[A-Z]{4}$'),
  display_timezone    text not null default 'Europe/Madrid'
                      check (char_length(display_timezone) <= 64),
  logbook_date_basis  public.logbook_date_basis not null default 'utc',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. AIRCRAFT – each pilot's own list (AMC1 (a)(2)(iv)-(v)).
-- ---------------------------------------------------------------------
create table public.aircraft (
  id                  uuid primary key default gen_random_uuid(),
  pilot_id            uuid not null default auth.uid()
                      references public.pilots (id) on delete cascade,
  registration        text not null
                      check (registration ~ '^[A-Z0-9]{1,3}-?[A-Z0-9]{1,6}$'), -- EC-ABC
  type_designator     text not null
                      check (type_designator ~ '^[A-Z][A-Z0-9]{1,3}$'),       -- C172
  make_model_variant  text not null
                      check (char_length(make_model_variant) between 1 and 80),
  engine_class        public.engine_class not null,
  certified_crew      public.certified_crew not null default 'single_pilot',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint aircraft_pilot_registration_key unique (pilot_id, registration),
  -- Target of the flights foreign key (same pilot + same engine class).
  constraint aircraft_engine_key unique (pilot_id, id, engine_class)
);


-- ---------------------------------------------------------------------
-- 4. FLIGHTS – one row per logbook entry.
--
-- Flight time (FCL.010, aeroplanes): from the moment the aircraft first
-- moves for the purpose of taking off until it finally comes to rest at
-- the end of the flight. AERONOTE records departure_at / arrival_at as
-- exactly those two moments, so normally:
--     total_minutes = recorded interval (arrival_at - departure_at)
-- A shorter total is accepted ONLY with a stated reason (series of
-- flights, or an explained correction). A longer total is impossible
-- and always rejected.
--
-- Signatures: countersignatory_name is a NAME typed by the pilot. It is
-- not a signature and the app never presents it as one.
-- ---------------------------------------------------------------------
create table public.flights (
  id                   uuid primary key default gen_random_uuid(),
  pilot_id             uuid not null default auth.uid()
                       references public.pilots (id) on delete cascade,

  aircraft_id            uuid not null,
  -- Filled automatically from the aircraft (trigger); verified by the FK.
  aircraft_engine_class  public.engine_class not null,

  -- Column 5: how the flight was actually operated.
  operation            public.operation_type not null default 'SP',

  -- Columns 2–3: place and time (UTC, whole minutes).
  departure_aerodrome  text not null check (departure_aerodrome ~ '^[A-Z]{4}$'),
  arrival_aerodrome    text not null check (arrival_aerodrome   ~ '^[A-Z]{4}$'),
  departure_at         timestamptz not null
                       check (departure_at = date_trunc('minute', departure_at)),
  arrival_at           timestamptz not null
                       check (arrival_at = date_trunc('minute', arrival_at)),

  -- Derived values (never typed, never out of date).
  flight_date_utc      date generated always as
                       ((departure_at at time zone 'UTC')::date) stored,
  recorded_interval_minutes integer generated always as
                       ((extract(epoch from (arrival_at - departure_at)) / 60)::integer) stored,

  -- Column 6: total time of flight.
  total_minutes        integer not null check (total_minutes between 1 and 1440),
  duration_difference_reason public.duration_difference_reason,
  duration_difference_note   text
                       check (char_length(duration_difference_note) between 1 and 300),

  -- Column 5: single-pilot SE / single-pilot ME / multi-pilot time.
  se_minutes           integer not null default 0 check (se_minutes >= 0),
  me_minutes           integer not null default 0 check (me_minutes >= 0),
  multi_pilot_minutes  integer not null default 0 check (multi_pilot_minutes >= 0),

  -- Column 9: operational condition time.
  night_minutes        integer not null default 0 check (night_minutes >= 0),
  ifr_minutes          integer not null default 0 check (ifr_minutes >= 0),

  -- Column 10: pilot function time.
  pic_minutes          integer not null default 0 check (pic_minutes >= 0),
  solo_minutes         integer not null default 0 check (solo_minutes >= 0),   -- within PIC
  spic_minutes         integer not null default 0 check (spic_minutes >= 0),   -- within PIC
  picus_minutes        integer not null default 0 check (picus_minutes >= 0),  -- within PIC
  copilot_minutes      integer not null default 0 check (copilot_minutes >= 0),
  crcp_minutes         integer not null default 0 check (crcp_minutes >= 0),   -- within co-pilot
  dual_minutes         integer not null default 0 check (dual_minutes >= 0),
  instructor_minutes   integer not null default 0 check (instructor_minutes >= 0), -- within PIC
  -- FE: all time acting as examiner, and the part spent in a pilot seat
  -- (only that part may be logged as PIC — AMC1 (b)(1)(iv)).
  examiner_minutes            integer not null default 0 check (examiner_minutes >= 0),
  examiner_pilot_seat_minutes integer not null default 0 check (examiner_pilot_seat_minutes >= 0),

  -- Column 8: landings as pilot flying, by day and by night.
  landings_day         smallint not null default 0 check (landings_day   between 0 and 99),
  landings_night       smallint not null default 0 check (landings_night between 0 and 99),
  full_stop_landings   smallint not null default 0 check (full_stop_landings >= 0),

  is_cross_country     boolean not null default false,

  -- Column 7: name(s) of PIC, or "SELF".
  pic_name             text not null check (char_length(pic_name) between 1 and 100),
  -- Name of the PIC/FI expected to countersign SPIC/PICUS time.
  -- A recorded NAME only — not a signature.
  countersignatory_name text check (char_length(countersignatory_name) between 1 and 100),

  -- Column 12: remarks and endorsements.
  remarks              text not null default '' check (char_length(remarks) <= 1000),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Same pilot's aircraft, with the correct engine class.
  constraint flights_aircraft_fkey
    foreign key (pilot_id, aircraft_id, aircraft_engine_class)
    references public.aircraft (pilot_id, id, engine_class)
    on update cascade,

  -- Recorded times: arrival after departure, at most 24 hours later.
  constraint flights_times_order_check
    check (arrival_at > departure_at
           and arrival_at - departure_at <= interval '24 hours'),

  -- Flight time can never exceed the recorded interval; if it is
  -- shorter, a reason is mandatory; if equal, no reason is allowed.
  constraint flights_duration_consistency_check
    check (total_minutes <= recorded_interval_minutes
           and ((total_minutes = recorded_interval_minutes
                 and duration_difference_reason is null
                 and duration_difference_note is null)
             or (total_minutes < recorded_interval_minutes
                 and duration_difference_reason is not null))),
  -- "Other" differences must be explained.
  constraint flights_duration_note_check
    check (duration_difference_reason is distinct from 'other'
           or duration_difference_note is not null),
  -- A series of flights returns each time to the place of departure.
  constraint flights_series_same_place_check
    check (duration_difference_reason is distinct from 'series_of_flights'
           or departure_aerodrome = arrival_aerodrome),

  -- Column 5 must account for the whole flight.
  constraint flights_operation_split_check
    check (se_minutes + me_minutes + multi_pilot_minutes = total_minutes),
  -- Physical fact: SE time only in SE aircraft, ME time only in ME aircraft.
  constraint flights_engine_class_check
    check ((aircraft_engine_class = 'SE' and me_minutes = 0)
        or (aircraft_engine_class = 'ME' and se_minutes = 0)),
  -- Time columns must match the operation actually flown.
  constraint flights_operation_time_check
    check ((operation = 'SP' and multi_pilot_minutes = 0)
        or (operation = 'MP' and se_minutes = 0 and me_minutes = 0)
        or (operation = 'SP_MP' and multi_pilot_minutes > 0
            and se_minutes + me_minutes > 0)),

  -- Operational conditions cannot exceed the flight.
  constraint flights_conditions_check
    check (night_minutes <= total_minutes and ifr_minutes <= total_minutes),

  -- One seat role per minute: PIC, co-pilot and dual never overlap.
  -- Examiner time spent OUTSIDE a pilot seat cannot be any seat role.
  constraint flights_function_split_check
    check (pic_minutes + copilot_minutes + dual_minutes
           + (examiner_minutes - examiner_pilot_seat_minutes) <= total_minutes),
  -- Solo, SPIC and PICUS are subdivisions of PIC.
  constraint flights_pic_breakdown_check
    check (solo_minutes + spic_minutes + picus_minutes <= pic_minutes),
  -- Instructor time is also entered as PIC (AMC1 notes (i)(8)(iii)).
  constraint flights_instructor_check
    check (instructor_minutes <= pic_minutes),
  -- Examiner: pilot-seat part within examiner time and within PIC;
  -- examiner time never exceeds the flight.
  constraint flights_examiner_check
    check (examiner_pilot_seat_minutes <= examiner_minutes
           and examiner_pilot_seat_minutes <= pic_minutes
           and examiner_minutes <= total_minutes),
  -- CRCP is logged as co-pilot time (AMC1 (b)(3)).
  constraint flights_crcp_check
    check (crcp_minutes <= copilot_minutes),
  -- Co-pilot (incl. CRCP) and PICUS require more than one pilot
  -- (AMC1 (b)(1)(v), (b)(2), (b)(3)): together they must fit inside the
  -- MULTI-PILOT minutes actually recorded (works for SP, MP and SP_MP).
  constraint flights_multi_pilot_roles_check
    check (copilot_minutes + picus_minutes <= multi_pilot_minutes),
  -- Solo means the only pilot on board: it must fit inside the
  -- SINGLE-PILOT minutes actually recorded (SE + ME).
  constraint flights_solo_check
    check (solo_minutes <= se_minutes + me_minutes),

  -- Full-stop landings cannot exceed total landings.
  constraint flights_full_stop_check
    check (full_stop_landings <= landings_day + landings_night)
);


-- ---------------------------------------------------------------------
-- 5. FSTD SESSIONS (AMC1 (a)(3) and notes (i)(9)).
--    Record: type and qualification number of the device, FSTD
--    instruction, date, total time of session, accumulated total.
-- ---------------------------------------------------------------------
create table public.fstd_sessions (
  id                    uuid primary key default gen_random_uuid(),
  pilot_id              uuid not null default auth.uid()
                        references public.pilots (id) on delete cascade,
  session_date          date not null,
  device_category       public.fstd_category not null,
  -- Optional qualification level, e.g. "Level D" or "FTD 2".
  device_level          text check (char_length(device_level) between 1 and 20),
  -- Required for every session (AMC1 (a)(3)(i)).
  qualification_number  text not null
                        check (char_length(qualification_number) between 1 and 40),
  -- Aircraft type represented, e.g. "B738". Required for FFS and FTD.
  aircraft_type         text check (char_length(aircraft_type) between 1 and 40),
  -- FSTD instruction (AMC1 (a)(3)(ii)).
  instruction           public.fstd_instruction not null,
  -- Instructor (or examiner, for a check taken). AERONOTE requires it for
  -- instruction_received and check_taken (see constraint below).
  instructor_or_examiner_name text
                        check (char_length(instructor_or_examiner_name) between 1 and 100),
  -- Type of exercise (AMC1 notes (i)(9)(iii)).
  exercise              text not null check (char_length(exercise) between 1 and 200),
  -- Total time incl. pre- and after-flight checks (notes (i)(9)(ii)).
  duration_minutes      integer not null check (duration_minutes between 1 and 1440),
  remarks               text not null default '' check (char_length(remarks) <= 1000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint fstd_aircraft_type_check
    check (device_category not in ('FFS', 'FTD') or aircraft_type is not null),
  -- AERONOTE rule (an interpretation of "FSTD instruction", not wording
  -- taken from the AMC): record who instructed or examined you.
  constraint fstd_instructor_check
    check (instruction not in ('instruction_received', 'check_taken')
           or instructor_or_examiner_name is not null)
);


-- ---------------------------------------------------------------------
-- 6. OPENING BALANCES – totals carried over from a paper logbook,
--    covering everything up to and INCLUDING as_of_date.
--
--    Stable cutoff: cutoff_basis and cutoff_timezone are frozen when the
--    balance is saved, and cutoff_at is the exact instant the covered
--    period ends. A flight is inside the balance when it DEPARTED before
--    cutoff_at. Changing display preferences later never changes this.
-- ---------------------------------------------------------------------
create table public.opening_balances (
  pilot_id             uuid primary key default auth.uid()
                       references public.pilots (id) on delete cascade,
  as_of_date           date not null,
  cutoff_basis         public.logbook_date_basis not null,  -- set by trigger if omitted
  cutoff_timezone      text not null,                       -- set by trigger only
  cutoff_at            timestamptz generated always as
                       (((as_of_date + 1)::timestamp) at time zone cutoff_timezone) stored,
  source_note          text not null default ''
                       check (char_length(source_note) <= 200),

  total_minutes        integer not null default 0 check (total_minutes >= 0),
  se_minutes           integer not null default 0 check (se_minutes >= 0),
  me_minutes           integer not null default 0 check (me_minutes >= 0),
  multi_pilot_minutes  integer not null default 0 check (multi_pilot_minutes >= 0),
  night_minutes        integer not null default 0 check (night_minutes >= 0),
  ifr_minutes          integer not null default 0 check (ifr_minutes >= 0),
  pic_minutes          integer not null default 0 check (pic_minutes >= 0),
  solo_minutes         integer not null default 0 check (solo_minutes >= 0),
  spic_minutes         integer not null default 0 check (spic_minutes >= 0),
  picus_minutes        integer not null default 0 check (picus_minutes >= 0),
  copilot_minutes      integer not null default 0 check (copilot_minutes >= 0),
  crcp_minutes         integer not null default 0 check (crcp_minutes >= 0),
  dual_minutes         integer not null default 0 check (dual_minutes >= 0),
  instructor_minutes   integer not null default 0 check (instructor_minutes >= 0),
  examiner_minutes            integer not null default 0 check (examiner_minutes >= 0),
  examiner_pilot_seat_minutes integer not null default 0 check (examiner_pilot_seat_minutes >= 0),
  fstd_minutes         integer not null default 0 check (fstd_minutes >= 0),
  landings_day         integer not null default 0 check (landings_day >= 0),
  landings_night       integer not null default 0 check (landings_night >= 0),
  full_stop_landings   integer not null default 0 check (full_stop_landings >= 0),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint opening_operation_split_check
    check (se_minutes + me_minutes + multi_pilot_minutes = total_minutes),
  constraint opening_conditions_check
    check (night_minutes <= total_minutes and ifr_minutes <= total_minutes),
  constraint opening_function_split_check
    check (pic_minutes + copilot_minutes + dual_minutes
           + (examiner_minutes - examiner_pilot_seat_minutes) <= total_minutes),
  constraint opening_pic_breakdown_check
    check (solo_minutes + spic_minutes + picus_minutes <= pic_minutes),
  constraint opening_instructor_check
    check (instructor_minutes <= pic_minutes),
  constraint opening_examiner_check
    check (examiner_pilot_seat_minutes <= examiner_minutes
           and examiner_pilot_seat_minutes <= pic_minutes
           and examiner_minutes <= total_minutes),
  constraint opening_crcp_check
    check (crcp_minutes <= copilot_minutes),
  constraint opening_multi_pilot_roles_check
    check (copilot_minutes + picus_minutes <= multi_pilot_minutes),
  constraint opening_solo_check
    check (solo_minutes <= se_minutes + me_minutes),
  constraint opening_full_stop_check
    check (full_stop_landings <= landings_day + landings_night)
);


-- ---------------------------------------------------------------------
-- 7. INDEXES (unique constraints above already create their own).
-- ---------------------------------------------------------------------
create index flights_pilot_departure_idx  on public.flights (pilot_id, departure_at desc);
create index flights_aircraft_fkey_idx    on public.flights (pilot_id, aircraft_id, aircraft_engine_class);
create index flights_pilot_dep_ad_idx     on public.flights (pilot_id, departure_aerodrome);
create index flights_pilot_arr_ad_idx     on public.flights (pilot_id, arrival_aerodrome);
create index fstd_sessions_pilot_date_idx on public.fstd_sessions (pilot_id, session_date desc);


-- ---------------------------------------------------------------------
-- 8. TRIGGERS
-- ---------------------------------------------------------------------
create trigger pilots_validate_timezone
  before insert or update of display_timezone on public.pilots
  for each row execute function private.validate_display_timezone();

create trigger flights_fill_engine_class
  before insert or update of aircraft_id on public.flights
  for each row execute function private.fill_aircraft_engine_class();

create trigger opening_balances_set_cutoff
  before insert or update on public.opening_balances
  for each row execute function private.set_opening_balance_cutoff();

create trigger pilots_set_updated_at
  before update on public.pilots
  for each row execute function private.set_updated_at();
create trigger aircraft_set_updated_at
  before update on public.aircraft
  for each row execute function private.set_updated_at();
create trigger flights_set_updated_at
  before update on public.flights
  for each row execute function private.set_updated_at();
create trigger fstd_sessions_set_updated_at
  before update on public.fstd_sessions
  for each row execute function private.set_updated_at();
create trigger opening_balances_set_updated_at
  before update on public.opening_balances
  for each row execute function private.set_updated_at();

-- Automatic profile creation at sign-up. SECURITY DEFINER lets it insert
-- the profile although users have no INSERT right on "pilots". Its only
-- user-supplied input is an optional display name, trimmed and limited.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pilots (id, full_name)
  values (new.id,
          left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.pilots (id)
select id from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 9. VIEWS (security_invoker: they run with the caller's rights, so
--    Row Level Security on the underlying tables always applies).
--
-- Opening balance rule (stable, preference-independent):
--   flight  inside the balance  <=>  departure_at < cutoff_at
--   FSTD    inside the balance  <=>  session_date <= as_of_date
-- Entries inside the balance are marked included_in_opening_balance and
-- their running total does NOT get the balance added. Later entries
-- start from the balance and accumulate only post-balance entries, so
-- nothing is ever counted twice.
-- ---------------------------------------------------------------------
create view public.flight_log
with (security_invoker = true)
as
with base as (
  select
    f.*,
    a.registration,
    a.type_designator,
    a.make_model_variant,
    a.certified_crew                                        as aircraft_certified_crew,
    p.display_timezone,
    (f.departure_at at time zone p.display_timezone)        as departure_local,
    (f.arrival_at   at time zone p.display_timezone)        as arrival_local,
    (f.departure_at at time zone p.display_timezone)::date  as flight_date_local,
    case p.logbook_date_basis
      when 'local' then (f.departure_at at time zone p.display_timezone)::date
      else f.flight_date_utc
    end                                                     as logbook_date,
    ob.as_of_date                                           as opening_balance_date,
    ob.cutoff_at                                            as opening_balance_cutoff_at,
    coalesce(ob.total_minutes, 0)                           as opening_total_minutes
  from public.flights f
  join public.pilots   p on p.id = f.pilot_id
  join public.aircraft a on a.id = f.aircraft_id and a.pilot_id = f.pilot_id
  left join public.opening_balances ob on ob.pilot_id = f.pilot_id
), marked as (
  select b.*,
         (b.opening_balance_cutoff_at is not null
          and b.departure_at < b.opening_balance_cutoff_at) as included_in_opening_balance
  from base b
)
select
  m.*,
  case when m.included_in_opening_balance then 0 else m.opening_total_minutes end
    + sum(m.total_minutes) over (partition by m.pilot_id, m.included_in_opening_balance
                                 order by m.departure_at, m.id
                                 rows unbounded preceding)  as accumulated_total_minutes,
  -- Advisory warnings: shown to the pilot, never block saving.
  array_remove(array[
    case when m.aircraft_certified_crew = 'multi_pilot' and m.operation <> 'MP'
         then 'multi_pilot_certified_aircraft_operated_sp' end,
    case when m.spic_minutes + m.picus_minutes > 0
         then 'spic_picus_requires_countersignature' end,
    case when m.spic_minutes + m.picus_minutes > 0 and m.countersignatory_name is null
         then 'countersignatory_name_missing' end,
    case when m.dual_minutes > 0 and upper(m.pic_name) = 'SELF'
         then 'dual_time_with_self_as_pic' end,
    case when m.solo_minutes > 0 and upper(m.pic_name) <> 'SELF'
         then 'solo_time_with_other_pic' end,
    case when m.landings_night > 0 and m.night_minutes = 0
         then 'night_landing_without_night_time' end,
    case when m.duration_difference_reason = 'series_of_flights'
         then 'series_entry_check_30_minute_intervals' end,
    case when m.included_in_opening_balance
         then 'included_in_opening_balance' end
  ], null)                                                  as warnings
from marked m;

create view public.fstd_log
with (security_invoker = true)
as
with marked as (
  select
    s.*,
    (ob.as_of_date is not null and s.session_date <= ob.as_of_date)
                                                            as included_in_opening_balance,
    coalesce(ob.fstd_minutes, 0)                            as opening_fstd_minutes
  from public.fstd_sessions s
  left join public.opening_balances ob on ob.pilot_id = s.pilot_id
)
select
  m.*,
  case when m.included_in_opening_balance then 0 else m.opening_fstd_minutes end
    + sum(m.duration_minutes) over (partition by m.pilot_id, m.included_in_opening_balance
                                    order by m.session_date, m.created_at, m.id
                                    rows unbounded preceding)
                                                            as accumulated_session_minutes
from marked m;

-- One row per pilot: opening balance + entries after its date.
create view public.logbook_totals
with (security_invoker = true)
as
with fl as (
  select pilot_id,
         sum(total_minutes) total, sum(se_minutes) se, sum(me_minutes) me,
         sum(multi_pilot_minutes) mp, sum(night_minutes) night, sum(ifr_minutes) ifr,
         sum(pic_minutes) pic, sum(solo_minutes) solo, sum(spic_minutes) spic,
         sum(picus_minutes) picus, sum(copilot_minutes) copilot, sum(crcp_minutes) crcp,
         sum(dual_minutes) dual, sum(instructor_minutes) instructor,
         sum(examiner_minutes) examiner, sum(examiner_pilot_seat_minutes) examiner_seat,
         sum(landings_day) ldg_day, sum(landings_night) ldg_night,
         sum(full_stop_landings) ldg_full_stop, count(*) flights
  from public.flight_log
  where not included_in_opening_balance
  group by pilot_id
), fs as (
  select pilot_id, sum(duration_minutes) fstd, count(*) sessions
  from public.fstd_log
  where not included_in_opening_balance
  group by pilot_id
)
select
  p.id                                                         as pilot_id,
  coalesce(ob.total_minutes, 0)       + coalesce(fl.total, 0)      as total_minutes,
  coalesce(ob.se_minutes, 0)          + coalesce(fl.se, 0)         as se_minutes,
  coalesce(ob.me_minutes, 0)          + coalesce(fl.me, 0)         as me_minutes,
  coalesce(ob.multi_pilot_minutes, 0) + coalesce(fl.mp, 0)         as multi_pilot_minutes,
  coalesce(ob.night_minutes, 0)       + coalesce(fl.night, 0)      as night_minutes,
  coalesce(ob.ifr_minutes, 0)         + coalesce(fl.ifr, 0)        as ifr_minutes,
  coalesce(ob.pic_minutes, 0)         + coalesce(fl.pic, 0)        as pic_minutes,
  coalesce(ob.solo_minutes, 0)        + coalesce(fl.solo, 0)       as solo_minutes,
  coalesce(ob.spic_minutes, 0)        + coalesce(fl.spic, 0)       as spic_minutes,
  coalesce(ob.picus_minutes, 0)       + coalesce(fl.picus, 0)      as picus_minutes,
  coalesce(ob.copilot_minutes, 0)     + coalesce(fl.copilot, 0)    as copilot_minutes,
  coalesce(ob.crcp_minutes, 0)        + coalesce(fl.crcp, 0)       as crcp_minutes,
  coalesce(ob.dual_minutes, 0)        + coalesce(fl.dual, 0)       as dual_minutes,
  coalesce(ob.instructor_minutes, 0)  + coalesce(fl.instructor, 0) as instructor_minutes,
  coalesce(ob.examiner_minutes, 0)    + coalesce(fl.examiner, 0)   as examiner_minutes,
  coalesce(ob.examiner_pilot_seat_minutes, 0) + coalesce(fl.examiner_seat, 0)
                                                               as examiner_pilot_seat_minutes,
  coalesce(ob.fstd_minutes, 0)        + coalesce(fs.fstd, 0)       as fstd_minutes,
  coalesce(ob.landings_day, 0)        + coalesce(fl.ldg_day, 0)    as landings_day,
  coalesce(ob.landings_night, 0)      + coalesce(fl.ldg_night, 0)  as landings_night,
  coalesce(ob.full_stop_landings, 0)  + coalesce(fl.ldg_full_stop, 0) as full_stop_landings,
  coalesce(fl.flights, 0)                                      as flights_after_balance,
  coalesce(fs.sessions, 0)                                     as fstd_sessions_after_balance
from public.pilots p
left join public.opening_balances ob on ob.pilot_id = p.id
left join fl on fl.pilot_id = p.id
left join fs on fs.pilot_id = p.id;


-- ---------------------------------------------------------------------
-- 10. PERMISSIONS – start from nothing, grant only what is needed.
--     Column-level INSERT and UPDATE: users can never set ids, owners,
--     timestamps or derived values; the database generates them.
-- ---------------------------------------------------------------------
revoke all on public.pilots, public.aircraft, public.flights,
              public.fstd_sessions, public.opening_balances,
              public.flight_log, public.fstd_log, public.logbook_totals
  from public, anon, authenticated;
revoke all on function private.set_updated_at()             from public, anon, authenticated;
revoke all on function private.validate_display_timezone()  from public, anon, authenticated;
revoke all on function private.fill_aircraft_engine_class() from public, anon, authenticated;
revoke all on function private.set_opening_balance_cutoff() from public, anon, authenticated;
revoke all on function private.handle_new_user()            from public, anon, authenticated;

-- Read.
grant select on public.pilots, public.aircraft, public.flights,
                public.fstd_sessions, public.opening_balances,
                public.flight_log, public.fstd_log, public.logbook_totals
  to authenticated;

-- Delete (profiles: only by deleting the Auth account).
grant delete on public.aircraft, public.flights,
                public.fstd_sessions, public.opening_balances
  to authenticated;

-- PILOTS: no insert (created by trigger); edit own details only.
grant update (full_name, postal_address, licence_number, home_aerodrome,
              display_timezone, logbook_date_basis)
  on public.pilots to authenticated;

-- AIRCRAFT
grant insert (registration, type_designator, make_model_variant,
              engine_class, certified_crew)
  on public.aircraft to authenticated;
grant update (registration, type_designator, make_model_variant,
              engine_class, certified_crew)
  on public.aircraft to authenticated;

-- FLIGHTS (aircraft_engine_class is filled by the trigger)
grant insert (aircraft_id, operation,
              departure_aerodrome, arrival_aerodrome, departure_at, arrival_at,
              total_minutes, duration_difference_reason, duration_difference_note,
              se_minutes, me_minutes, multi_pilot_minutes,
              night_minutes, ifr_minutes,
              pic_minutes, solo_minutes, spic_minutes, picus_minutes,
              copilot_minutes, crcp_minutes, dual_minutes,
              instructor_minutes, examiner_minutes, examiner_pilot_seat_minutes,
              landings_day, landings_night, full_stop_landings,
              is_cross_country, pic_name, countersignatory_name, remarks)
  on public.flights to authenticated;
grant update (aircraft_id, operation,
              departure_aerodrome, arrival_aerodrome, departure_at, arrival_at,
              total_minutes, duration_difference_reason, duration_difference_note,
              se_minutes, me_minutes, multi_pilot_minutes,
              night_minutes, ifr_minutes,
              pic_minutes, solo_minutes, spic_minutes, picus_minutes,
              copilot_minutes, crcp_minutes, dual_minutes,
              instructor_minutes, examiner_minutes, examiner_pilot_seat_minutes,
              landings_day, landings_night, full_stop_landings,
              is_cross_country, pic_name, countersignatory_name, remarks)
  on public.flights to authenticated;

-- FSTD SESSIONS
grant insert (session_date, device_category, device_level, qualification_number,
              aircraft_type, instruction, instructor_or_examiner_name,
              exercise, duration_minutes, remarks)
  on public.fstd_sessions to authenticated;
grant update (session_date, device_category, device_level, qualification_number,
              aircraft_type, instruction, instructor_or_examiner_name,
              exercise, duration_minutes, remarks)
  on public.fstd_sessions to authenticated;

-- OPENING BALANCES (pilot_id comes from the signed-in user;
-- cutoff_timezone and cutoff_at are set by the database)
grant insert (as_of_date, cutoff_basis, source_note,
              total_minutes, se_minutes, me_minutes, multi_pilot_minutes,
              night_minutes, ifr_minutes,
              pic_minutes, solo_minutes, spic_minutes, picus_minutes,
              copilot_minutes, crcp_minutes, dual_minutes,
              instructor_minutes, examiner_minutes, examiner_pilot_seat_minutes,
              fstd_minutes, landings_day, landings_night, full_stop_landings)
  on public.opening_balances to authenticated;
grant update (as_of_date, cutoff_basis, source_note,
              total_minutes, se_minutes, me_minutes, multi_pilot_minutes,
              night_minutes, ifr_minutes,
              pic_minutes, solo_minutes, spic_minutes, picus_minutes,
              copilot_minutes, crcp_minutes, dual_minutes,
              instructor_minutes, examiner_minutes, examiner_pilot_seat_minutes,
              fstd_minutes, landings_day, landings_night, full_stop_landings)
  on public.opening_balances to authenticated;


-- ---------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY – owner-only access on every table.
--     (Policies are unchanged by column grants: a request must pass
--      BOTH the column permission and the row policy.)
-- ---------------------------------------------------------------------
alter table public.pilots           enable row level security;
alter table public.aircraft         enable row level security;
alter table public.flights          enable row level security;
alter table public.fstd_sessions    enable row level security;
alter table public.opening_balances enable row level security;

-- Pilots
create policy "Pilots can view own profile"
  on public.pilots for select to authenticated
  using (id = (select auth.uid()));
create policy "Pilots can update own profile"
  on public.pilots for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Aircraft
create policy "Pilots can view own aircraft"
  on public.aircraft for select to authenticated
  using (pilot_id = (select auth.uid()));
create policy "Pilots can add own aircraft"
  on public.aircraft for insert to authenticated
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can update own aircraft"
  on public.aircraft for update to authenticated
  using (pilot_id = (select auth.uid()))
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can delete own aircraft"
  on public.aircraft for delete to authenticated
  using (pilot_id = (select auth.uid()));

-- Flights
create policy "Pilots can view own flights"
  on public.flights for select to authenticated
  using (pilot_id = (select auth.uid()));
create policy "Pilots can add own flights"
  on public.flights for insert to authenticated
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can update own flights"
  on public.flights for update to authenticated
  using (pilot_id = (select auth.uid()))
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can delete own flights"
  on public.flights for delete to authenticated
  using (pilot_id = (select auth.uid()));

-- FSTD sessions
create policy "Pilots can view own FSTD sessions"
  on public.fstd_sessions for select to authenticated
  using (pilot_id = (select auth.uid()));
create policy "Pilots can add own FSTD sessions"
  on public.fstd_sessions for insert to authenticated
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can update own FSTD sessions"
  on public.fstd_sessions for update to authenticated
  using (pilot_id = (select auth.uid()))
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can delete own FSTD sessions"
  on public.fstd_sessions for delete to authenticated
  using (pilot_id = (select auth.uid()));

-- Opening balances
create policy "Pilots can view own opening balance"
  on public.opening_balances for select to authenticated
  using (pilot_id = (select auth.uid()));
create policy "Pilots can add own opening balance"
  on public.opening_balances for insert to authenticated
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can update own opening balance"
  on public.opening_balances for update to authenticated
  using (pilot_id = (select auth.uid()))
  with check (pilot_id = (select auth.uid()));
create policy "Pilots can delete own opening balance"
  on public.opening_balances for delete to authenticated
  using (pilot_id = (select auth.uid()));

commit;
