const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const round = n => Math.round(n);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const toNum = v => { const n = parseFloat(v); return isFinite(n) ? n : NaN; };
const form = $('#form');

if (form) {
  let units = 'metric';
  const heightEl = $('#height'), inchesEl = $('#inches'), weightEl = $('#weight');
  const heightUnit = $('#heightUnit'), weightUnit = $('#weightUnit');

  const LIMITS = {
    metric: { heightMin: 120, heightMax: 230, heightStep: 1, weightMin: 35, weightMax: 300 },
    imperial: { heightMin: 3, heightMax: 8, heightStep: 1, weightMin: 77, weightMax: 661 }
  };

  const errorEl = document.createElement('p');
  errorEl.className = 'form-error hidden';
  errorEl.setAttribute('role', 'alert');
  form.insertBefore(errorEl, form.querySelector('button[type="submit"]'));

  function showError(message, fieldId) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    const field = fieldId ? $('#' + fieldId) : null;
    if (field) field.focus();
  }
  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  function applyUnitUI() {
    const l = LIMITS[units];
    heightEl.min = l.heightMin;
    heightEl.max = l.heightMax;
    heightEl.step = l.heightStep;
    weightEl.min = l.weightMin;
    weightEl.max = l.weightMax;
    weightEl.step = 0.1;
    if (inchesEl) { inchesEl.min = 0; inchesEl.max = 11; inchesEl.step = 1; }
    heightUnit.textContent = units === 'metric' ? 'cm' : 'ft';
    weightUnit.textContent = units === 'metric' ? 'kg' : 'lb';
    $$('.imperial-only').forEach(el => { el.style.display = units === 'imperial' ? 'flex' : 'none'; });
    $$('[data-units]').forEach(btn => btn.classList.toggle('active', btn.dataset.units === units));
  }

  function cmToFtIn(cm) {
    const totalIn = round(cm / 2.54);
    return [Math.floor(totalIn / 12), totalIn % 12];
  }

  $$('[data-units]').forEach(btn => btn.addEventListener('click', () => {
    const next = btn.dataset.units;
    if (!next || next === units) return;
    clearError();
    if (next === 'imperial') {
      const cm = toNum(heightEl.value);
      if (!isNaN(cm)) {
        const [ft, inch] = cmToFtIn(cm);
        heightEl.value = ft;
        if (inchesEl) inchesEl.value = inch;
      }
      const kg = toNum(weightEl.value);
      if (!isNaN(kg)) weightEl.value = (kg * 2.20462).toFixed(1);
    } else {
      const ft = toNum(heightEl.value);
      const inch = inchesEl ? (toNum(inchesEl.value) || 0) : 0;
      if (!isNaN(ft)) heightEl.value = round((ft * 12 + inch) * 2.54);
      const lb = toNum(weightEl.value);
      if (!isNaN(lb)) weightEl.value = (lb / 2.20462).toFixed(1);
    }
    units = next;
    applyUnitUI();
  }));

  const goalEl = $('#goal');
  const ratioEl = $('#ratio');
  const cycleEl = $('#cycle');

  if (goalEl) goalEl.addEventListener('change', () => {
    const rateRow = $('#rateRow');
    if (rateRow) rateRow.classList.toggle('hidden', goalEl.value === 'maintain');
  });
  if (ratioEl) ratioEl.addEventListener('change', () => {
    const custom = $('#custom');
    if (custom) custom.classList.toggle('hidden', ratioEl.value !== 'custom');
  });
  if (cycleEl) cycleEl.addEventListener('change', () => {
    const fields = $('#cycleFields');
    if (fields) fields.classList.toggle('hidden', cycleEl.value !== 'on');
  });

  form.addEventListener('input', clearError);
  form.addEventListener('change', clearError);
  applyUnitUI();

  form.addEventListener('submit', e => {
    e.preventDefault();
    clearError();

    const num = id => { const el = $('#' + id); return el ? toNum(el.value) : NaN; };

    const age = num('age');
    if (!(age >= 18 && age <= 100)) return showError('Enter an age between 18 and 100.', 'age');

    let cm;
    if (units === 'metric') {
      cm = num('height');
      if (!(cm >= 120 && cm <= 230)) return showError('Enter a height between 120 and 230 cm.', 'height');
    } else {
      const ft = num('height');
      const inches = isNaN(num('inches')) ? 0 : num('inches');
      if (isNaN(ft) || inches < 0 || inches > 11) return showError('Enter your height in feet, with inches between 0 and 11.', 'inches');
      cm = (ft * 12 + inches) * 2.54;
      if (cm < 120 || cm > 230) return showError('Enter a height between 3 ft 11 in and 7 ft 7 in.', 'height');
    }

    const weightInput = num('weight');
    if (units === 'metric' ? !(weightInput >= 35 && weightInput <= 300) : !(weightInput >= 77 && weightInput <= 661)) {
      return showError(units === 'metric' ? 'Enter a weight between 35 and 300 kg.' : 'Enter a weight between 77 and 661 lb.', 'weight');
    }
    const kg = units === 'metric' ? weightInput : weightInput / 2.20462;

    const bfEl = $('#bf');
    const bfRaw = bfEl ? bfEl.value.trim() : '';
    const bf = bfRaw === '' ? null : parseFloat(bfRaw);
    if (bf !== null && (!isFinite(bf) || bf < 3 || bf > 65)) {
      return showError('Body fat must be between 3% and 65%, or left blank.', 'bf');
    }

    const goal = goalEl ? goalEl.value : 'maintain';
    const rate = num('rate');
    if (goal !== 'maintain' && !(rate >= 0.1 && rate <= 1)) {
      return showError('Weekly change must be between 0.1% and 1% of body weight.', 'rate');
    }

    let customRatios = null;
    if (ratioEl && ratioEl.value === 'custom') {
      const ps = num('rp'), cs = num('rc'), fs = num('rf');
      if (!(ps > 0 && cs > 0 && fs > 0)) return showError('Enter a percentage for protein, carbs, and fat.', 'rp');
      if (round(ps + cs + fs) !== 100) return showError('Custom macro percentages must add up to 100.', 'rp');
      customRatios = [ps, cs, fs];
    }

    const sex = $('#sex').value;
    const activity = parseFloat($('#activity').value);

    let bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
    let formula = 'Mifflin–St Jeor';
    if (bf !== null) {
      bmr = 370 + 21.6 * (kg * (1 - bf / 100));
      formula = 'Katch–McArdle (body-fat based)';
    }
    const tdee = bmr * activity;
    const delta = goal === 'lose' ? -1 : goal === 'gain' ? 1 : 0;
    let adjustment = 0;
    if (goal !== 'maintain') {
      adjustment = Math.min(tdee * 0.25, kg * rate / 100 * 7700 / 7);
      if (goal === 'gain') adjustment = Math.min(tdee * 0.15, adjustment);
    }
    const calories = Math.max(1200, round(tdee + delta * adjustment));

    const pPref = parseFloat($('#protein').value);
    const fPref = parseFloat($('#fat').value);
    let protein, fat, carbs, ratios;
    if (customRatios) {
      const [ps, cs, fs] = customRatios;
      protein = calories * ps / 100 / 4;
      carbs = calories * cs / 100 / 4;
      fat = calories * fs / 100 / 9;
      ratios = [ps, cs, fs];
    } else {
      protein = Math.min(kg * pPref, calories * 0.45 / 4);
      fat = Math.min(kg * fPref, calories * 0.35 / 9);
      carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
      const total = protein * 4 + carbs * 4 + fat * 9;
      ratios = [protein * 4 / total * 100, carbs * 4 / total * 100, fat * 9 / total * 100];
    }
    protein = round(protein);
    fat = round(fat);
    carbs = round(carbs);
    const macroCal = [protein * 4, carbs * 4, fat * 9];
    const sum = macroCal.reduce((a, b) => a + b, 0);
    const pct = macroCal.map(n => round(n / sum * 100));

    let cycle = '';
    if (cycleEl && cycleEl.value === 'on') {
      const days = clamp(num('days') || 4, 1, 6);
      const rest = 7 - days;
      const manual = num('trainingCal');
      let tr = manual || round(calories * 1.12 / 25) * 25;
      let rr = round((calories * 7 - tr * days) / rest / 25) * 25;
      if (rr < 1200) {
        rr = 1200;
        tr = round((calories * 7 - rr * rest) / days / 25) * 25;
      }
      cycle = `<div class="cycle-result"><b>Training days:</b> ${tr.toLocaleString()} kcal · <b>Rest days:</b> ${rr.toLocaleString()} kcal<br>Weekly average: ~${round((tr * days + rr * rest) / 7).toLocaleString()} kcal/day.</div>`;
    }

    const weeklyKg = Math.abs(adjustment) * 7 / 7700;
    const weeklyDisplay = units === 'metric' ? weeklyKg : weeklyKg * 2.20462;
    const unitLabel = units === 'metric' ? 'kg' : 'lb';
    const goalLabels = { lose: 'Lose weight', gain: 'Gain weight', maintain: 'Maintain weight' };
    const goalText = goal === 'lose'
      ? `A ${round(adjustment)} kcal/day deficit corresponds to a rough ${weeklyDisplay.toFixed(1)} ${unitLabel}/week target.`
      : goal === 'gain'
        ? `A ${round(adjustment)} kcal/day surplus supports a gradual ${weeklyDisplay.toFixed(1)} ${unitLabel}/week target.`
        : 'Maintenance starts near estimated daily energy use.';

    const [ft, inch] = cmToFtIn(cm);
    const heightText = units === 'metric' ? `${round(cm)} cm` : `${ft} ft ${inch} in`;
    const weightText = units === 'metric' ? `${kg.toFixed(1)} kg` : `${(kg * 2.20462).toFixed(1)} lb`;
    const activityLabel = $('#activity').selectedOptions[0].textContent.split(' · ')[0];

    const intro = $('#results .result-empty'), out = $('#resultContent');
    intro.classList.add('hidden');
    out.classList.remove('hidden');
    out.innerHTML = `<div class="eyebrow">HELLO MACRO CALCULATOR</div><div class="result-title">YOUR PERSONALIZED DAILY TARGETS</div><div class="export-inputs"><b>YOUR INPUTS</b><span>${age} years · ${heightText} · ${weightText}</span><span>${activityLabel} · ${goalLabels[goal]} · ${units === 'metric' ? 'Metric' : 'Imperial'}</span><span>Protein ${pPref} g/kg · Fat ${fPref} g/kg${bf !== null ? ` · Body fat ${bf}%` : ''}</span></div><div class="total">${calories.toLocaleString()} <span>kcal</span></div><div class="result-sub">${goalText}</div><div class="macro-list">${[['Protein', protein, pct[0]], ['Carbohydrates', carbs, pct[1]], ['Fat', fat, pct[2]]].map(([n, g, p], i) => `<div class="macro-card"><div class="macro-top"><strong>${g}g</strong><small>${macroCal[i].toLocaleString()} kcal · ${p}%</small></div><div class="macro-name">${n}</div><div class="bar"><i style="width:${p}%"></i></div></div>`).join('')}</div><div class="result-meta"><div class="meta-box"><span>ESTIMATED BMR</span><b>${round(bmr).toLocaleString()} kcal</b></div><div class="meta-box"><span>ESTIMATED TDEE</span><b>${round(tdee).toLocaleString()} kcal</b></div></div><div class="explanation"><b>Why these numbers?</b> ${formula} estimates resting energy; activity scales it to an estimated TDEE. Your goal adjusts calories, protein (${pPref} g/kg) and fat (${fPref} g/kg) preferences set those targets, and carbs fill the remaining calories.</div>${cycle}<div class="actions"><button id="copy">Copy results</button><button id="pdf">Print / Save PDF</button><button id="share">Share</button></div><p class="disclaimer-mini">Estimates only; not medical advice or precise physiological requirements. Adjust using 2–3 weeks of weight trends.</p>`;

    const resultText = `Daily target: ${calories} kcal\nProtein: ${protein} g (${pct[0]}%)\nCarbs: ${carbs} g (${pct[1]}%)\nFat: ${fat} g (${pct[2]}%)\nEstimated BMR: ${round(bmr)} kcal\nEstimated TDEE: ${round(tdee)} kcal\n${goalText}`;
    $('#copy').onclick = async () => { await navigator.clipboard.writeText(resultText); $('#copy').textContent = 'Copied!'; };
    $('#pdf').onclick = () => window.print();
    $('#share').onclick = async () => {
      if (navigator.share) await navigator.share({ title: 'My macro targets', text: resultText });
      else { await navigator.clipboard.writeText(resultText); $('#share').textContent = 'Copied link details'; }
    };
    $('#results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}
