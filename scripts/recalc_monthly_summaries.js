const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const env = dotenv.parse(fs.readFileSync(path.join(process.cwd(), '.env.local')));
for (const k of Object.keys(env)) process.env[k] = env[k];

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recalc(yearMonth) {
  const from = `${yearMonth}-01`;
  const [yStr, mStr] = yearMonth.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  const { data: recs, error: recErr } = await supabase
    .from('chore_records')
    .select('child_id, count, unit_price_snapshot')
    .gte('date', from)
    .lte('date', to)
    .order('child_id');

  if (recErr) {
    console.error('chore_records error', recErr);
    return;
  }

  const byChild = (recs || []).reduce((acc, r) => {
    const key = r.child_id;
    if (!acc[key]) acc[key] = { chore_total: 0 };
    acc[key].chore_total += (r.count || 0) * (r.unit_price_snapshot || 0);
    return acc;
  }, {});

  const childIds = Object.keys(byChild);
  for (const childId of childIds) {
    const chore_total = byChild[childId].chore_total;
    // get base_allowance
    const { data: profile } = await supabase.from('profiles').select('base_allowance').eq('id', childId).single();
    const base = profile?.base_allowance ?? 0;
    const total_amount = base + chore_total;
    const { error } = await supabase.from('monthly_summaries').upsert({
      child_id: childId,
      year_month: yearMonth,
      base_allowance: base,
      chore_total: chore_total,
      total_amount,
    }, { onConflict: 'child_id,year_month' });
    if (error) console.error('upsert error', childId, error);
    else console.log('updated', childId, yearMonth, 'chore_total', chore_total);
  }

  // for children that have no records but have summaries, leave them alone
}

(async ()=>{
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node recalc_monthly_summaries.js YYYY-MM');
    process.exit(1);
  }
  await recalc(args[0]);
})();
