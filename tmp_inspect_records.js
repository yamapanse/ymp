const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const env = dotenv.parse(fs.readFileSync(path.join(process.cwd(), '.env.local')));
for (const k of Object.keys(env)) process.env[k] = env[k];
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const months = ['2026-03','2026-04','2026-05'];
  for (const ym of months) {
    const from = `${ym}-01`;
    const to = ['04','06','09','11'].some((m) => ym.endsWith(`-${m}`)) ? `${ym}-30` : ym.endsWith('-02') ? `${ym}-28` : `${ym}-31`;
    const { data: recs, error: recErr } = await supabase
      .from('chore_records')
      .select('id, child_id, date, count, unit_price_snapshot, chore_master_id')
      .gte('date', from)
      .lte('date', to)
      .order('child_id')
      .order('date');
    console.log('---', ym, 'records', recs?.length, 'error', recErr);
    if (recs) {
      const byChild = recs.reduce((acc, r) => {
        const key = r.child_id;
        if (!acc[key]) acc[key] = { count: 0, total: 0, recs: 0 };
        acc[key].count += r.count;
        acc[key].total += r.count * r.unit_price_snapshot;
        acc[key].recs += 1;
        return acc;
      }, {});
      console.log(byChild);
    }
    const { data: sums, error: sumErr } = await supabase
      .from('monthly_summaries')
      .select('*')
      .eq('year_month', ym)
      .order('child_id');
    console.log('summary', sums?.length, 'error', sumErr);
    console.log(sums);
  }
})();
