// ---- Helpers ----
const toCents = (value) => Math.round(Number(value) * 100);
const centsMul = (cents, factor) => Math.round(cents * Number(factor));
const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const round = (val) => Math.round(Number(val) * 100) / 100;

// ---- Core Calculation ----
function calculateBid(sf, thicknessInches) {
  const markup = 1.43;
  const laborRate = 48;
  const baseMaterialRate = 35;
  const compactorRentalC = toCents(250);
  const concreteMaterialRate = 225;
  const flatworkRate = 1.75;
  const flatworkMin = 1500;
  const roadCompaction = 1.2;  // loose volume factor
  const concreteWaste = 1.2;   // 20% extra ordered

  // Volume (CY)
  const cy = (sf * thicknessInches) / 324;

  // Soil removal (labor only)
  const soilLaborHours = cy * 0.6;
  const soilCostC = toCents(soilLaborHours * laborRate);
  const soilPriceC = centsMul(soilCostC, markup);

  // Road base
  const baseDesignCY = cy;
  const baseLooseCY = baseDesignCY * roadCompaction;
  const baseMaterialCostC = toCents(baseLooseCY * baseMaterialRate);
  const baseLaborHours = baseLooseCY * 1.0;
  const baseLaborCostC = toCents(baseLaborHours * laborRate);
  const baseCostC = baseMaterialCostC + baseLaborCostC + compactorRentalC;
  const basePriceC = centsMul(baseCostC, markup);

  // Concrete
  const creteDesignCY = cy;
  const creteOrderedCY = creteDesignCY * concreteWaste;
  const creteMaterialCostC = toCents(creteOrderedCY * concreteMaterialRate);
  const creteFlatworkC = Math.max(toCents(flatworkMin), toCents(sf * flatworkRate));
  const creteCostC = creteMaterialCostC + creteFlatworkC;
  const cretePriceC = centsMul(creteCostC, markup);

  const totalPriceC = soilPriceC + basePriceC + cretePriceC;

  return {
    soil: { priceC: soilPriceC },
    roadBase: { priceC: basePriceC, looseCY: round(baseLooseCY) },
    concrete: {
      priceC: cretePriceC,
      designCY: creteDesignCY,
      orderedCY: creteOrderedCY
    },
    totals: { priceC: totalPriceC },
    handoff: {
      installPrep: {
        totalLaborHours: round(soilLaborHours + baseLaborHours)
      },
      roadBase: {
        looseCY: round(baseLooseCY)
      },
      concrete: {
        designCY: round(creteDesignCY),
        orderedCY: round(creteOrderedCY),
        // Budget: orderedCY * $225, then apply 1.43 markup
        budgetCents: centsMul(toCents(creteOrderedCY * concreteMaterialRate), markup)
      }
    }
  };
}

// ---- Render Output ----
function render(result) {
  // Prices
  const resultsEl = document.getElementById('results');
  resultsEl.classList.remove('hidden');
  document.getElementById('soilPrice').textContent = money(result.soil.priceC);
  document.getElementById('basePrice').textContent = money(result.roadBase.priceC);
  document.getElementById('cretePrice').textContent = money(result.concrete.priceC);
  document.getElementById('totPrice').textContent = money(result.totals.priceC);

  // Handoff
  const handoffEl = document.getElementById('handoff');
  const copyBtn = document.getElementById('copyBtn');

  if (document.getElementById('handoffToggle').checked) {
    const thickness = document.getElementById('thicknessInput').value || '';
    const labor = result.handoff.installPrep.totalLaborHours;
    const roadCY = result.handoff.roadBase.looseCY;
    const designCY = result.handoff.concrete.designCY;
    const orderedCY = result.handoff.concrete.orderedCY;
    const budget = money(result.handoff.concrete.budgetCents);

    const handoffText = `Concrete Installation:
- ${labor} labor hours
- ${roadCY} yards road base at ${thickness} inches thick
- ${designCY} yards concrete (${orderedCY} ordered — ${budget} budget)`;

    handoffEl.classList.remove('hidden');
    handoffEl.innerHTML = `
      <h2>Operational handoff</h2>
      <pre id="handoffText">${handoffText}</pre>
    `;

    copyBtn.classList.remove('hidden');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(handoffText).then(() => showToast("Copied handoff"));
    };
  } else {
    handoffEl.classList.add('hidden');
    copyBtn.classList.add('hidden');
  }
}

// ---- Calc trigger ----
function calcAndRender() {
  const sf = parseFloat(document.getElementById('sfInput').value);
  const thickness = parseFloat(document.getElementById('thicknessInput').value);
  const valid = isFinite(sf) && isFinite(thickness) && sf > 0 && thickness > 0;

  if (!valid) {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('handoff').classList.add('hidden');
    document.getElementById('copyBtn').classList.add('hidden');
    return;
    }
  const result = calculateBid(sf, thickness);
  render(result);
}

// ---- UI wiring ----
document.getElementById('calcBtn').addEventListener('click', calcAndRender);
document.getElementById('sfInput').addEventListener('input', calcAndRender);
document.getElementById('thicknessInput').addEventListener('input', calcAndRender);
document.getElementById('handoffToggle').addEventListener('change', calcAndRender);

// ---- Tiny toast ----
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1200);
}

// ---- PWA: register service worker ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
