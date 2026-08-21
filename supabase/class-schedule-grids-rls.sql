-- class_schedule_grids RLS (production-schedule-grid-full-migration.sql 보완)
-- Supabase SQL Editor에서 실행

ALTER TABLE public.class_schedule_grids ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS class_schedule_grids_authenticated_all ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_select_class_schedule_grids ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_insert_class_schedule_grids ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_update_class_schedule_grids ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_delete_class_schedule_grids ON public.class_schedule_grids';

  EXECUTE $p$
    CREATE POLICY class_schedule_grids_authenticated_all
      ON public.class_schedule_grids
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true)
  $p$;

  EXECUTE $p$
    CREATE POLICY dev_anon_select_class_schedule_grids
      ON public.class_schedule_grids
      FOR SELECT TO anon, authenticated
      USING (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY dev_anon_insert_class_schedule_grids
      ON public.class_schedule_grids
      FOR INSERT TO anon, authenticated
      WITH CHECK (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY dev_anon_update_class_schedule_grids
      ON public.class_schedule_grids
      FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY dev_anon_delete_class_schedule_grids
      ON public.class_schedule_grids
      FOR DELETE TO anon, authenticated
      USING (true)
  $p$;
END $$;
