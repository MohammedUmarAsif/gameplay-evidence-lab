-- PostgreSQL, executed locally by scripts/analyse-export.ts.
-- Input: one validated dataset in pilot_dataset(payload jsonb).
-- Aggregate each child table before joining; avoid inflated counts from joins.
WITH dataset AS (SELECT payload FROM pilot_dataset),
configs AS (
  SELECT c->>'id' id, c->>'label' label FROM dataset,
  LATERAL jsonb_array_elements(payload->'configurations') c
), sessions AS (
  SELECT s->>'id' id, s->>'configurationId' config_id
  FROM dataset, LATERAL jsonb_array_elements(payload->'sessions') s
), event_rollup AS (
  SELECT e->>'sessionId' session_id, count(*) events,
    count(*) FILTER (WHERE latest.status = 'verified') verified_events
  FROM dataset, LATERAL jsonb_array_elements(payload->'events') e
  LEFT JOIN LATERAL (
    SELECT r->>'status' status FROM jsonb_array_elements(payload->'reviews') r
    WHERE r->>'eventId' = e->>'id'
    ORDER BY (r->>'annotationVersion')::integer DESC LIMIT 1
  ) latest ON true
  GROUP BY e->>'sessionId'
), feedback_rollup AS (
  SELECT f->>'sessionId' session_id, count(*) feedback_records,
    count(*) FILTER (WHERE f->'enjoyment' = 'null'::jsonb) missing_enjoyment
  FROM dataset, LATERAL jsonb_array_elements(payload->'feedback') f
  GROUP BY f->>'sessionId'
)
SELECT c.id configuration_id, c.label configuration_label,
  count(s.id)::integer sessions,
  coalesce(sum(e.events), 0)::integer events,
  coalesce(sum(e.verified_events), 0)::integer verified_events,
  coalesce(sum(f.feedback_records), 0)::integer feedback_records,
  coalesce(sum(f.missing_enjoyment), 0)::integer missing_enjoyment_responses,
  count(s.id) FILTER (WHERE coalesce(e.events, 0)=0)::integer sessions_without_events,
  count(s.id) FILTER (WHERE coalesce(f.feedback_records, 0)=0)::integer sessions_without_feedback
FROM configs c LEFT JOIN sessions s ON s.config_id=c.id
LEFT JOIN event_rollup e ON e.session_id=s.id
LEFT JOIN feedback_rollup f ON f.session_id=s.id
GROUP BY c.id, c.label ORDER BY c.id;
