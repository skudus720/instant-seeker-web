begin;

delete from public.site_settings
where key = 'privacy.screenshot_retention_days';

comment on column public.analyses.private_image_path is
  'Legacy-only private screenshot path. New analysis screenshots are processed transiently and this field remains null.';

commit;
