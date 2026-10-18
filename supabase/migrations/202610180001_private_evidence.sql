-- Private metadata only. No buckets, public participant writes, or video storage.
create table public.evidence_studies (
  id text primary key,
  document jsonb not null,
  active boolean not null default false,
  retention_days integer not null default 30 check (retention_days between 1 and 365),
  constraint study_id_match check (document->>'id' = id)
);
create table public.evidence_memberships (
  study_id text not null references public.evidence_studies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('participant','researcher')),
  primary key (study_id,user_id)
);
create table public.evidence_submissions (
  id uuid primary key,
  study_id text not null references public.evidence_studies(id),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dataset jsonb not null check (dataset->>'origin' = 'submitted'),
  content_hash text not null,
  withdrawal_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (octet_length(dataset::text) <= 600000)
);
create index evidence_owner_created on public.evidence_submissions(owner_id,created_at);
create index evidence_expiry on public.evidence_submissions(expires_at);
create table public.evidence_submission_receipts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index evidence_receipt_owner_created on public.evidence_submission_receipts(owner_id,created_at);
alter table public.evidence_submission_receipts enable row level security;
revoke all on public.evidence_submission_receipts from anon,authenticated;
alter table public.evidence_studies enable row level security;
alter table public.evidence_memberships enable row level security;
alter table public.evidence_submissions enable row level security;
revoke all on public.evidence_studies,public.evidence_memberships,public.evidence_submissions from anon,authenticated;
-- These tables can never be written directly by browser roles.
grant select (id,document,active,retention_days) on public.evidence_studies to authenticated;
grant select on public.evidence_memberships to authenticated;
grant select (id,study_id,owner_id,dataset,created_at,expires_at) on public.evidence_submissions to authenticated;

create policy membership_self_read on public.evidence_memberships for select to authenticated using (user_id=(select auth.uid()));
create policy invited_study_read on public.evidence_studies for select to authenticated using (
  exists(select 1 from public.evidence_memberships m where m.study_id=id and m.user_id=(select auth.uid()))
);
create policy submission_private_read on public.evidence_submissions for select to authenticated using (
  expires_at > now() and (owner_id=(select auth.uid()) or exists (
    select 1 from public.evidence_memberships m where m.study_id=evidence_submissions.study_id and m.user_id=(select auth.uid()) and m.role='researcher'
  ))
);

-- Service-only RPCs give atomic idempotency, rate limits and review sequencing.
create function public.evidence_submit(p_id uuid,p_study text,p_owner uuid,p_dataset jsonb,p_hash text,p_withdrawal text)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.evidence_submissions%rowtype; days integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
  if not exists(select 1 from public.evidence_memberships where user_id=p_owner and study_id=p_study) then raise exception 'Not invited'; end if;
  select retention_days into days from public.evidence_studies where id=p_study and active=true;
  if days is null then raise exception 'Study inactive'; end if;
  select * into existing from public.evidence_submissions where id=p_id;
  if found then
    if existing.owner_id<>p_owner or existing.content_hash<>p_hash or existing.withdrawal_hash<>p_withdrawal then raise exception 'Idempotency conflict'; end if;
    return p_id;
  end if;
  if exists(select 1 from public.evidence_submission_receipts where id=p_id) then raise exception 'Previously withdrawn or expired submission ID'; end if;
  if (select count(*) from public.evidence_submission_receipts where owner_id=p_owner and created_at>now()-interval '1 day')>=20 then raise exception 'Daily limit'; end if;
  if (select count(*) from public.evidence_submissions where owner_id=p_owner)>=200 then raise exception 'Account limit'; end if;
  insert into public.evidence_submissions(id,study_id,owner_id,dataset,content_hash,withdrawal_hash,expires_at)
  values(p_id,p_study,p_owner,p_dataset,p_hash,p_withdrawal,now()+make_interval(days=>days));
  insert into public.evidence_submission_receipts(id,owner_id,expires_at) values(p_id,p_owner,now()+make_interval(days=>days+30));
  return p_id;
end $$;
create function public.evidence_withdraw(p_id uuid,p_owner uuid,p_withdrawal text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  delete from public.evidence_submissions where id=p_id and owner_id=p_owner and withdrawal_hash=p_withdrawal;
  return found;
end $$;
create function public.evidence_review(p_id uuid,p_researcher uuid,p_review jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare row public.evidence_submissions%rowtype; expected integer;
begin
  select * into row from public.evidence_submissions where id=p_id and expires_at>now() for update;
  if not found then raise exception 'Unavailable'; end if;
  if not exists(select 1 from public.evidence_memberships where study_id=row.study_id and user_id=p_researcher and role='researcher') then raise exception 'Researcher required'; end if;
  if not exists(select 1 from jsonb_array_elements(row.dataset->'events') e where e->>'id'=p_review->>'eventId' and e->>'label'=p_review->>'originalLabel') then raise exception 'Event mismatch'; end if;
  select coalesce(max((r->>'annotationVersion')::integer),1)+1 into expected from jsonb_array_elements(row.dataset->'reviews') r where r->>'eventId'=p_review->>'eventId';
  if (p_review->>'annotationVersion')::integer<>expected then raise exception 'Review version conflict; reload'; end if;
  if exists(select 1 from jsonb_array_elements(row.dataset->'reviews') r where r->>'id'=p_review->>'id') then raise exception 'Duplicate review'; end if;
  update public.evidence_submissions set dataset=jsonb_set(dataset,'{reviews}',(dataset->'reviews')||jsonb_build_array(p_review)) where id=p_id;
  return true;
end $$;
create function public.evidence_purge_expired() returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  delete from public.evidence_submissions where expires_at<=now();
  get diagnostics removed=row_count;
  delete from public.evidence_submission_receipts where expires_at<=now();
  return removed;
end $$;
revoke all on function public.evidence_submit(uuid,text,uuid,jsonb,text,text), public.evidence_withdraw(uuid,uuid,text), public.evidence_review(uuid,uuid,jsonb), public.evidence_purge_expired() from public,anon,authenticated;
grant execute on function public.evidence_submit(uuid,text,uuid,jsonb,text,text), public.evidence_withdraw(uuid,uuid,text), public.evidence_review(uuid,uuid,jsonb), public.evidence_purge_expired() to service_role;
-- Before activation: configure a daily private cron job to call evidence_purge_expired().
-- Auth users and operational logs have separate provider retention; document those in the study.
