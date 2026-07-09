const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('#site-nav');

if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}


// Interactive DUAgent browser-side demo.
const demoSteps = [
  {
    title: 'Submit autonomous goal',
    method: 'POST',
    endpoint: '/agent/run-autonomous-experiment',
    description: 'Submit the optimisation objective, strategy, diagnostics, and safety constraints.'
  },
  {
    title: 'Load strategy schema',
    method: 'GET',
    endpoint: '/strategies',
    description: 'Load ordered diagnostic variables and bounded control variables for the selected workflow.'
  },
  {
    title: 'Create controller',
    method: 'POST',
    endpoint: '/controllers/create',
    description: 'Instantiate a reusable controller through the controller factory.'
  },
  {
    title: 'Suggest controls',
    method: 'POST',
    endpoint: '/controllers/{id}/suggest-controls',
    description: 'Map the current diagnostic state to adaptive control variables.'
  },
  {
    title: 'Apply safety guard',
    method: 'INTERNAL',
    endpoint: 'SafetyGuard.project()',
    description: 'Clip proposed controls using schema bounds and user-defined constraints.'
  },
  {
    title: 'Execute controlled round',
    method: 'POST',
    endpoint: '/quantum/run-controlled-round',
    description: 'Run a controlled classical or quantum optimisation round and return feedback.'
  },
  {
    title: 'Update controller',
    method: 'POST',
    endpoint: '/controllers/{id}/update-controller',
    description: 'Use feedback to update the controller for the next round.'
  },
  {
    title: 'Evaluate continue/stop',
    method: 'DECISION',
    endpoint: 'Evaluator',
    description: 'Evaluate the stopping rule and decide whether to continue, stop, or save.'
  }
];

let demoStep = 0;
let demoTimer = null;

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const round = (value, digits = 3) => Number(value.toFixed(digits));

function readDemoParams() {
  const workflow = $('demoWorkflow')?.value || 'quantum';
  return {
    workflow,
    previousLoss: Number($('previousLoss')?.value || 0.8),
    gradientNorm: Number($('gradientNorm')?.value || 0.4),
    shotNoise: Number($('shotNoise')?.value || 0.05),
    circuitDepth: Number($('circuitDepth')?.value || 2),
    maxShots: Number($('maxShots')?.value || 4096),
    targetLoss: Number($('targetLoss')?.value || 0.4)
  };
}

function computeDemo(params) {
  if (params.workflow === 'classical') {
    const lr = clamp(0.004 + 0.035 * params.previousLoss + 0.012 * params.gradientNorm, 0.0001, 0.05);
    const mu = clamp(0.015 + 0.12 * params.gradientNorm + 0.04 * Math.max(params.previousLoss - params.targetLoss, 0), 0, 0.2);
    const epochs = clamp(Math.round(params.circuitDepth / 3) + 1, 1, 5);
    const improvement = clamp(0.055 + 0.18 * lr + 0.035 * epochs - 0.06 * params.gradientNorm, 0.015, 0.22);
    const projectedLoss = clamp(params.previousLoss - improvement, 0.08, 1.2);
    const decision = projectedLoss <= params.targetLoss ? 'stop' : 'continue';

    return {
      strategyId: 'classical_fedprox',
      controllerFamily: 'classical',
      primaryLabel: 'Learning rate',
      primaryValue: lr.toFixed(4),
      resourceLabel: 'FedProx μ',
      resourceValue: mu.toFixed(3),
      depthLabel: 'Local epochs',
      safeDepthValue: String(epochs),
      projectedLoss,
      decision,
      proposedControls: { learning_rate: round(lr, 5), mu: round(mu, 3), epochs },
      safeControls: { learning_rate: round(lr, 5), mu: round(mu, 3), epochs },
      clipped: [],
      explanation: `Classical FedProx mode selected. Higher gradient norm increases proximal regularisation, while local epochs are kept within the schema bound.`
    };
  }

  const thetaLearningRate = clamp(0.006 + 0.05 * params.previousLoss + 0.018 * params.gradientNorm - 0.025 * params.shotNoise, 0.00001, 0.1);
  const proposedShots = Math.round(256 + params.maxShots * (0.20 + 0.52 * params.shotNoise + 0.18 * params.gradientNorm + 0.10 * Math.max(params.previousLoss - params.targetLoss, 0)));
  const safeShots = clamp(proposedShots, 128, params.maxShots);
  const proposedDepth = clamp(Math.round(params.circuitDepth + 5 * params.shotNoise + 2 * params.gradientNorm), 1, 12);
  const safeDepth = clamp(proposedDepth, 1, 8);
  const measurementReuse = clamp(0.28 + 0.55 * params.shotNoise + 0.20 * params.gradientNorm, 0, 1);
  const resourceGain = Math.log2(Math.max(safeShots, 128) / 128) / 8;
  const improvement = clamp(0.035 + 0.065 * resourceGain + 0.035 * thetaLearningRate - 0.18 * params.shotNoise - 0.015 * Math.max(safeDepth - 6, 0), 0.006, 0.24);
  const projectedLoss = clamp(params.previousLoss - improvement, 0.08, 1.2);
  const decision = projectedLoss <= params.targetLoss ? 'stop' : 'continue';
  const clipped = [];
  if (safeShots < proposedShots) clipped.push('shots');
  if (safeDepth < proposedDepth) clipped.push('circuit_depth');

  return {
    strategyId: 'quantum_qfl',
    controllerFamily: 'quantum',
    primaryLabel: 'θ learning rate',
    primaryValue: thetaLearningRate.toFixed(4),
    resourceLabel: 'Shots',
    resourceValue: String(safeShots),
    depthLabel: 'Circuit depth',
    safeDepthValue: String(safeDepth),
    projectedLoss,
    decision,
    proposedControls: {
      theta_learning_rate: round(thetaLearningRate, 5),
      shots: proposedShots,
      circuit_depth: proposedDepth,
      measurement_reuse: round(measurementReuse, 3)
    },
    safeControls: {
      theta_learning_rate: round(thetaLearningRate, 5),
      shots: safeShots,
      circuit_depth: safeDepth,
      measurement_reuse: round(measurementReuse, 3)
    },
    clipped,
    explanation: clipped.length
      ? `Quantum QFL mode selected. The safety layer clipped ${clipped.join(' and ')} before execution.`
      : 'Quantum QFL mode selected. The proposed controls satisfy the active safety constraints.'
  };
}

function makeDemoPayload(stepIndex, params, computed) {
  const commonDiagnostics = params.workflow === 'quantum'
    ? {
        previous_loss: round(params.previousLoss),
        quantum_gradient_norm: round(params.gradientNorm, 3),
        shot_noise: round(params.shotNoise, 3),
        circuit_depth: params.circuitDepth,
        round_index: Math.min(stepIndex, 3)
      }
    : {
        previous_loss: round(params.previousLoss),
        gradient_norm: round(params.gradientNorm, 3),
        update_norm: round(params.gradientNorm * 0.72, 3),
        data_heterogeneity: 0.5,
        round_index: Math.min(stepIndex, 3)
      };

  const schemas = params.workflow === 'quantum'
    ? {
        state_variables: ['previous_loss', 'quantum_gradient_norm', 'parameter_shift_variance', 'shot_noise', 'circuit_depth', 'round_index'],
        control_variables: {
          theta_learning_rate: [0.00001, 0.1],
          shots: [128, 8192],
          circuit_depth: [1, 12],
          measurement_reuse: [0, 1]
        }
      }
    : {
        state_variables: ['previous_loss', 'gradient_norm', 'update_norm', 'data_heterogeneity', 'round_index'],
        control_variables: {
          learning_rate: [0.0001, 0.05],
          mu: [0, 0.2],
          epochs: [1, 5]
        }
      };

  const payloads = [
    {
      request: {
        experiment_name: `${computed.strategyId}_interactive_page_demo`,
        strategy_id: computed.strategyId,
        objective: 'minimize_validation_loss',
        diagnostics: commonDiagnostics,
        constraints: params.workflow === 'quantum'
          ? { max_shots: params.maxShots, max_circuit_depth: 8 }
          : { max_learning_rate: 0.05, max_epochs: 5 },
        executor_type: params.workflow === 'quantum' ? 'quantum_api' : 'external_csv'
      },
      response: { status: 'started', message: 'Autonomous experiment initialised', round_index: 0 }
    },
    {
      request: { strategy_id: computed.strategyId },
      response: schemas
    },
    {
      request: { strategy_id: computed.strategyId, controller_family: computed.controllerFamily, backend: 'torch' },
      response: { controller_id: 'ctrl_demo_2026', controller_type: 'TorchDeepUnfoldedController', backend: 'torch' }
    },
    {
      request: { controller_id: 'ctrl_demo_2026', diagnostics: commonDiagnostics },
      response: computed.proposedControls
    },
    {
      request: {
        proposed_controls: computed.proposedControls,
        safety_constraints: params.workflow === 'quantum'
          ? { max_shots: params.maxShots, max_circuit_depth: 8 }
          : { max_learning_rate: 0.05, max_epochs: 5 }
      },
      response: { safe_controls: computed.safeControls, clipped: computed.clipped }
    },
    {
      request: { controller_id: 'ctrl_demo_2026', controls: computed.safeControls },
      response: {
        train_loss: round(computed.projectedLoss + 0.018),
        validation_loss: round(computed.projectedLoss),
        reward: round(params.previousLoss - computed.projectedLoss),
        executor: params.workflow === 'quantum' ? 'quantum_api_executor' : 'external_csv_executor'
      }
    },
    {
      request: { controller_id: 'ctrl_demo_2026', feedback: { validation_loss: round(computed.projectedLoss), reward: round(params.previousLoss - computed.projectedLoss) } },
      response: { status: 'updated', controller_id: 'ctrl_demo_2026' }
    },
    {
      request: { current_validation_loss: round(computed.projectedLoss), target_validation_loss: round(params.targetLoss), max_rounds: 3, current_round: 3 },
      response: { status: computed.decision === 'stop' ? 'completed' : 'continue', final_decision: computed.decision, best_validation_loss: round(computed.projectedLoss) }
    }
  ];

  return payloads[stepIndex] || payloads[0];
}

function updateSliderLabels(params) {
  if (!$('lossValue')) return;
  $('lossValue').textContent = params.previousLoss.toFixed(3);
  $('gradValue').textContent = params.gradientNorm.toFixed(2);
  $('noiseValue').textContent = params.shotNoise.toFixed(2);
  $('depthValue').textContent = String(params.circuitDepth);
  $('maxShotsValue').textContent = String(params.maxShots);
  $('targetValue').textContent = params.targetLoss.toFixed(3);
  document.body.classList.toggle('classical-demo', params.workflow === 'classical');
}

function renderDemo() {
  if (!$('demoStepTitle')) return;
  const params = readDemoParams();
  const computed = computeDemo(params);
  const step = demoSteps[demoStep];
  const payload = makeDemoPayload(demoStep, params, computed);

  updateSliderLabels(params);

  document.querySelectorAll('[data-demo-step]').forEach((node) => {
    const nodeStep = Number(node.dataset.demoStep);
    node.classList.toggle('active', nodeStep === demoStep);
    node.classList.toggle('complete', nodeStep < demoStep);
  });

  $('demoStepTitle').textContent = step.title;
  $('demoCurrentDescription').textContent = step.description;
  $('demoMethod').textContent = step.method;
  $('demoEndpoint').textContent = step.endpoint;
  $('demoRequestJson').textContent = JSON.stringify(payload.request, null, 2);
  $('demoResponseJson').textContent = JSON.stringify(payload.response, null, 2);

  $('primaryControlLabel').textContent = computed.primaryLabel;
  $('primaryControlValue').textContent = computed.primaryValue;
  $('resourceLabel').textContent = computed.resourceLabel;
  $('resourceValue').textContent = computed.resourceValue;
  $('depthLabel').textContent = computed.depthLabel;
  $('safeDepthValue').textContent = computed.safeDepthValue;
  $('projectedLossValue').textContent = computed.projectedLoss.toFixed(3);
  $('currentLossText').textContent = params.previousLoss.toFixed(3);
  $('projectedLossText').textContent = computed.projectedLoss.toFixed(3);
  $('currentLossBar').style.width = `${clamp(params.previousLoss / 1.2, 0.02, 1) * 100}%`;
  $('projectedLossBar').style.width = `${clamp(computed.projectedLoss / 1.2, 0.02, 1) * 100}%`;
  $('sandboxInterpretation').textContent = `${computed.explanation} Current loss is ${params.previousLoss.toFixed(3)} and the projected validation loss is ${computed.projectedLoss.toFixed(3)}; the evaluator would ${computed.decision}.`;
}

function stopDemoTimer() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
}

function nextDemoStep() {
  if (demoStep < demoSteps.length - 1) {
    demoStep += 1;
  } else {
    stopDemoTimer();
  }
  renderDemo();
}

function startDemoLoop() {
  stopDemoTimer();
  demoStep = 0;
  renderDemo();
  demoTimer = setInterval(() => {
    if (demoStep >= demoSteps.length - 1) {
      stopDemoTimer();
      return;
    }
    nextDemoStep();
  }, 1600);
}

function resetDemoLoop() {
  stopDemoTimer();
  demoStep = 0;
  renderDemo();
}

if ($('demoStart')) {
  $('demoStart').addEventListener('click', startDemoLoop);
  $('demoNext').addEventListener('click', () => { stopDemoTimer(); nextDemoStep(); });
  $('demoReset').addEventListener('click', resetDemoLoop);

  ['demoWorkflow', 'previousLoss', 'gradientNorm', 'shotNoise', 'circuitDepth', 'maxShots', 'targetLoss'].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('input', renderDemo);
  });

  renderDemo();
}

// Contributor tab controls.
const personTabs = document.querySelectorAll('[data-person]');
const personPanels = document.querySelectorAll('[data-person-panel]');

if (personTabs.length && personPanels.length) {
  personTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selected = tab.dataset.person;
      personTabs.forEach((item) => item.classList.toggle('active', item === tab));
      personPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.personPanel === selected);
      });
    });
  });
}
