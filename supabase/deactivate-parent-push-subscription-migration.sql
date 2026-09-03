-- Additive: deactivate a single parent push subscription by access key + endpoint.
-- Run in Supabase SQL Editor. Does not drop or delete subscription rows.

CREATE OR REPLACE FUNCTION public.deactivate_parent_push_subscription(
  p_access_key text,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid_access_key';
  END IF;

  UPDATE public.parent_push_subscriptions
  SET is_active = false,
      updated_at = now()
  WHERE student_id = v_student_id
    AND endpoint = trim(p_endpoint)
    AND is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_parent_push_subscription(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_parent_push_subscription(text, text) TO anon;
