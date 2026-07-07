import { INPUT_CLASS, CALC_CLASS } from './state.js';
import { togglePlanWms } from './plans.js';

function buildWmsField(wrapper, fields, grid) {
  const labelRow = document.createElement('div');
  labelRow.className = 'hidden sm:flex gap-3 items-center flex-nowrap mb-0.5';
  const repsLabel = document.createElement('span');
  repsLabel.className = 'form-label text-xs flex-1';
  repsLabel.textContent = 'Reps';
  labelRow.appendChild(repsLabel);
  const labelSpacer = document.createElement('span');
  labelSpacer.className = 'w-4 shrink-0';
  labelRow.appendChild(labelSpacer);
  const loadLabel = document.createElement('span');
  loadLabel.className = 'form-label text-xs flex-1';
  loadLabel.textContent = 'Load';
  labelRow.appendChild(loadLabel);
  const pillSpacer = document.createElement('span');
  pillSpacer.className = 'w-24 shrink-0';
  labelRow.appendChild(pillSpacer);
  wrapper.appendChild(labelRow);
  const inputRow = document.createElement('div');
  inputRow.className = 'flex gap-3 items-center flex-nowrap';
  const repsInput = document.createElement('input');
  repsInput.type = 'number';
  repsInput.id = 'plan-reps';
  repsInput.placeholder = 'Reps';
  repsInput.min = 1;
  repsInput.step = 1;
  repsInput.className = INPUT_CLASS + ' min-w-0 flex-1';
  inputRow.appendChild(repsInput);
  fields['plan-reps'] = repsInput;
  const sep = document.createElement('span');
  sep.className = 'text-slate-500 text-xs font-mono shrink-0';
  sep.textContent = '@';
  inputRow.appendChild(sep);
  const loadInput = document.createElement('input');
  loadInput.type = 'number';
  loadInput.id = 'plan-weight';
  loadInput.placeholder = 'Load';
  loadInput.min = 0;
  loadInput.step = 'any';
  loadInput.className = INPUT_CLASS + ' min-w-0 flex-1';
  inputRow.appendChild(loadInput);
  fields['plan-weight'] = loadInput;
  const pill = document.createElement('div');
  pill.className = 'wms-pill shrink-0';
  pill.id = 'plan-wms-pill';
  pill.dataset.mode = 'absolute';
  const modes = ['absolute', 'pct', 'rpe'];
  const plabels = ['kg', '%', 'RPE'];
  modes.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wms-pill-btn' + (m === 'absolute' ? ' is-active' : '');
    btn.dataset.mode = m;
    btn.textContent = plabels[i];
    btn.onclick = function () { togglePlanWms(this); };
    pill.appendChild(btn);
  });
  fields['plan-wms-pill'] = pill;
  inputRow.appendChild(pill);
  wrapper.appendChild(inputRow);
  const calcRow = document.createElement('div');
  calcRow.className = 'flex items-center mt-1';
  const calcSpan = document.createElement('span');
  calcSpan.id = 'plan-calc-weight';
  calcSpan.className = 'text-emerald-400 font-mono text-xs hidden';
  calcSpan.textContent = '\u2192';
  calcRow.appendChild(calcSpan);
  fields['plan-calc-weight'] = calcSpan;
  wrapper.appendChild(calcRow);
  grid.appendChild(wrapper);
}

function applyFieldAttributes(input, fd, fieldValues) {
  if (!fd.attrs) return;
  Object.entries(fd.attrs).forEach(([k, v]) => {
    if (k === 'value') {
      input.value = v;
      fieldValues[fd.id] = v;
    } else if (v === true) {
      input.setAttribute(k, '');
    } else {
      input.setAttribute(k, v);
    }
  });
}

function renderFormFields(containerId, schema, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const existingGrid = container.querySelector('.schema-grid');
  if (existingGrid) existingGrid.remove();
  const grid = document.createElement('div');
  grid.className = 'schema-grid grid grid-cols-12 gap-3';
  container.appendChild(grid);
  const fields = {};
  const fieldValues = { ...options.initialValues };
  schema.forEach(fd => {
    const wrapper = document.createElement('div');
    wrapper.className = fd.width;
    if (fd.type === 'wms') {
      if (fd.label) {
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = fd.label;
        wrapper.appendChild(label);
      }
      buildWmsField(wrapper, fields, grid);
      return;
    }
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = fd.label;
    if (fd.type !== 'readonly-calc') label.htmlFor = fd.id;
    wrapper.appendChild(label);
    if (fd.type === 'readonly-calc') {
      const display = document.createElement('div');
      display.id = fd.id;
      display.className = CALC_CLASS;
      display.textContent = '\u2014';
      wrapper.appendChild(display);
      fields[fd.id] = display;
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.id = fd.id;
      input.className = INPUT_CLASS;
      applyFieldAttributes(input, fd, fieldValues);
      input.addEventListener('input', () => {
        fieldValues[fd.id] = input.value;
        if (options.onFieldChange) options.onFieldChange(fieldValues);
      });
      wrapper.appendChild(input);
      fields[fd.id] = input;
    }
    grid.appendChild(wrapper);
  });
  return { fields, fieldValues, grid };
}


export { buildWmsField, applyFieldAttributes, renderFormFields };
