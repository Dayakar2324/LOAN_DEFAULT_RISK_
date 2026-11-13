const form = document.getElementById('loan-form');
const income = document.getElementById('person_income');
const amount = document.getElementById('loan_amnt');
const ratio = document.getElementById('loan_percent_income');
const errorBox = document.getElementById('error');
const submit = document.getElementById('submit');

function calculateRatio() {
  const value = Number(amount.value) / Number(income.value);
  ratio.value = Number.isFinite(value) && value > 0 ? value.toFixed(4) : '';
}
income.addEventListener('input', calculateRatio);
amount.addEventListener('input', calculateRatio);
calculateRatio();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  calculateRatio();
  errorBox.textContent = '';
  if (!ratio.value) {
    errorBox.textContent = 'Please enter a valid income and loan amount.';
    return;
  }

  const numericFields = [
    'person_age', 'person_income', 'person_emp_length', 'loan_amnt',
    'loan_int_rate', 'loan_percent_income', 'cb_person_cred_hist_length'
  ];
  const categoricalFields = [
    'person_home_ownership', 'loan_intent', 'loan_grade', 'cb_person_default_on_file'
  ];
  const payload = {};
  for (const field of numericFields) payload[field] = Number(document.getElementById(field).value);
  for (const field of categoricalFields) payload[field] = document.getElementById(field).value;

  submit.disabled = true;
  document.getElementById('button-text').textContent = 'Analyzing...';
  try {
    const response = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let message = `Prediction failed (HTTP ${response.status})`;
      try {
        const body = await response.json();
        if (Array.isArray(body.detail)) message = body.detail.map(x => `${x.loc?.slice(-1)[0] || 'Field'}: ${x.msg}`).join('; ');
        else if (typeof body.detail === 'string') message = body.detail;
      } catch (_) {}
      throw new Error(message);
    }
    const result = await response.json();
    const probability = Number(result.probability);
    const threshold = Number(result.defaultthreshold);
    const predictedClass = Number(result.default_prediction);
    if (!(probability >= 0 && probability <= 1) || !(threshold >= 0 && threshold <= 1) || ![0, 1].includes(predictedClass)) {
      throw new Error('The API returned an invalid prediction response.');
    }

    document.getElementById('empty-state').hidden = true;
    document.getElementById('results').hidden = false;
    const badge = document.getElementById('risk-badge');
    badge.textContent = predictedClass === 1 ? 'HIGH RISK' : 'LOW RISK';
    badge.className = `risk-badge ${predictedClass === 1 ? 'high' : 'low'}`;
    document.getElementById('risk-value').textContent = `${(probability * 100).toFixed(2)}%`;
    document.getElementById('threshold-value').textContent = `${(threshold * 100).toFixed(2)}%`;
    document.getElementById('class-value').textContent = String(predictedClass);
    const meter = document.getElementById('meter-fill');
    meter.style.width = `${probability * 100}%`;
    meter.style.background = predictedClass === 1 ? '#c5484c' : '#13876d';
    document.getElementById('threshold-marker').style.left = `${threshold * 100}%`;
    document.getElementById('insight').textContent = predictedClass === 1
      ? 'The estimated default probability is at or above your model’s decision threshold. This application has been flagged as higher risk.'
      : 'The estimated default probability is below your model’s decision threshold. This application has been flagged as lower risk.';
    if (window.matchMedia('(max-width: 850px)').matches) document.querySelector('.result-panel').scrollIntoView({behavior:'smooth'});
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    submit.disabled = false;
    document.getElementById('button-text').textContent = 'Analyze risk';
  }
});
