document.addEventListener("DOMContentLoaded", () => {
  const apiSteps = [
    {
      title: "Submit autonomous goal",
      endpoint: "POST /agent/run-autonomous-experiment",
      explanation:
        "The user submits the optimisation goal, initial diagnostics, safety constraints, controller mode, and executor type.",
      request: {
        experiment_name: "real_quantum_autonomous_demo",
        strategy_id: "quantum_qfl",
        controller_family: "quantum",
        backend: "torch",
        max_rounds: 3,
        use_real_controller: true,
        executor_type: "quantum_api",
        goal: {
          objective: "minimize_validation_loss",
          target_validation_loss: 0.4
        }
      },
      response: {
        run_id: "real_quantum_autonomous_demo_001",
        status: "started",
        mode: "quantum"
      },
      round: 0,
      loss: "0.800",
      shots: "—",
      decision: "Initialising"
    },
    {
      title: "Load strategy schema",
      endpoint: "GET /strategies",
      explanation:
        "The agent loads the registered strategy schema. This defines required diagnostics and valid control bounds.",
      request: {
        strategy_id: "quantum_qfl"
      },
      response: {
        state_variables: [
          "previous_loss",
          "quantum_gradient_norm",
          "parameter_shift_variance",
          "shot_noise",
          "circuit_depth",
          "round_index"
        ],
        control_variables: {
          theta_learning_rate: [0.00001, 0.1],
          shots: [128, 8192],
          circuit_depth: [1, 12],
          entanglement_depth: [1, 6],
          measurement_reuse: [0.0, 1.0]
        }
      },
      round: 0,
      loss: "0.800",
      shots: "—",
      decision: "Schema ready"
    },
    {
      title: "Create controller",
      endpoint: "POST /controllers/create",
      explanation:
        "The controller factory creates a deep-unfolded controller instance for the selected strategy and backend.",
      request: {
        strategy_id: "quantum_qfl",
        controller_family: "quantum",
        backend: "torch"
      },
      response: {
        controller_id: "ctrl_74a91f155a38",
        controller_type: "TorchDeepUnfoldedController",
        backend: "torch"
      },
      round: 0,
      loss: "0.800",
      shots: "—",
      decision: "Controller ready"
    },
    {
      title: "Suggest controls",
      endpoint: "POST /controllers/{controller_id}/suggest-controls",
      explanation:
        "The controller maps runtime diagnostics to bounded control suggestions.",
      request: {
        controller_id: "ctrl_74a91f155a38",
        diagnostics: {
          previous_loss: 0.8,
          quantum_gradient_norm: 0.4,
          parameter_shift_variance: 0.1,
          shot_noise: 0.05,
          circuit_depth: 2,
          round_index: 0
        }
      },
      response: {
        theta_learning_rate: 0.03689,
        shots: 3223,
        circuit_depth: 8,
        entanglement_depth: 3,
        measurement_reuse: 0.41067
      },
      round: 1,
      loss: "0.800",
      shots: "3223",
      decision: "Controls proposed"
    },
    {
      title: "Apply safety guard",
      endpoint: "Internal safety guard",
      explanation:
        "The agent clips proposed controls using schema bounds and user-defined safety constraints before execution.",
      request: {
        proposed_controls: {
          theta_learning_rate: 0.03689,
          shots: 4267,
          circuit_depth: 8
        },
        safety_constraints: {
          max_shots: 4096,
          max_circuit_depth: 8,
          max_theta_learning_rate: 0.05
        }
      },
      response: {
        safe_controls: {
          theta_learning_rate: 0.03689,
          shots: 4096,
          circuit_depth: 8
        },
        clipped: ["shots"]
      },
      round: 1,
      loss: "0.800",
      shots: "4096",
      decision: "Safe controls"
    },
    {
      title: "Execute controlled round",
      endpoint: "POST /quantum/run-controlled-round",
      explanation:
        "The executor applies the safe controls to the quantum round and returns real or recorded feedback.",
      request: {
        controller_id: "ctrl_74a91f155a38",
        controls: {
          theta_learning_rate: 0.03689,
          shots: 4096,
          circuit_depth: 8
        },
        parameters: [0.1, -0.2, 0.05],
        features: [0.4, 0.7, 0.2]
      },
      response: {
        train_loss: 0.7544,
        validation_loss: 0.7549,
        reward: 0.045,
        executor: "quantum_api_executor"
      },
      round: 1,
      loss: "0.755",
      shots: "4096",
      decision: "Feedback received"
    },
    {
      title: "Update controller",
      endpoint: "POST /controllers/{controller_id}/update-controller",
      explanation:
        "The controller is updated using feedback so that future control suggestions can improve.",
      request: {
        controller_id: "ctrl_74a91f155a38",
        diagnostics: {
          previous_loss: 0.8,
          shot_noise: 0.05,
          round_index: 0
        },
        controls: {
          theta_learning_rate: 0.03689,
          shots: 4096,
          circuit_depth: 8
        },
        feedback: {
          validation_loss: 0.7549,
          reward: 0.045
        }
      },
      response: {
        status: "updated",
        controller_id: "ctrl_74a91f155a38"
      },
      round: 2,
      loss: "0.702",
      shots: "3809",
      decision: "Learning"
    },
    {
      title: "Evaluate continue or stop",
      endpoint: "Evaluator decision",
      explanation:
        "The evaluator compares the latest validation loss with the target and decides whether to continue or stop.",
      request: {
        target_validation_loss: 0.4,
        current_validation_loss: 0.649,
        patience: 3,
        max_rounds: 3
      },
      response: {
        status: "completed",
        final_decision: "max_rounds_reached",
        best_round: 2,
        best_validation_loss: 0.649
      },
      round: 3,
      loss: "0.649",
      shots: "4096",
      decision: "Max rounds reached"
    }
  ];

  let currentStep = -1;
  let timer = null;

  const startButton = document.getElementById("startDemo");
  const nextButton = document.getElementById("nextStep");
  const resetButton = document.getElementById("resetDemo");

  const titleEl = document.getElementById("currentStepTitle");
  const descriptionEl = document.getElementById("currentStepDescription");

  const metricRound = document.getElementById("metricRound");
  const metricLoss = document.getElementById("metricLoss");
  const metricShots = document.getElementById("metricShots");
  const metricDecision = document.getElementById("metricDecision");

  const endpointEl = document.getElementById("inspectorEndpoint");
  const inspectorTitle = document.getElementById("inspectorTitle");
  const inspectorExplanation = document.getElementById("inspectorExplanation");
  const requestJson = document.getElementById("requestJson");
  const responseJson = document.getElementById("responseJson");

  const activeElements = document.querySelectorAll("[data-step]");
  const inspectorButtons = document.querySelectorAll("[data-inspect-step]");

  function prettyJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function renderStep() {
    activeElements.forEach((element) => {
      const step = Number(element.dataset.step);
      element.classList.remove("is-active", "is-complete");

      if (step < currentStep) {
        element.classList.add("is-complete");
      }

      if (step === currentStep) {
        element.classList.add("is-active");
      }
    });

    inspectorButtons.forEach((button) => {
      const step = Number(button.dataset.inspectStep);
      button.classList.toggle("is-active", step === currentStep);
    });

    if (currentStep < 0) {
      titleEl.textContent = "Ready";
      descriptionEl.textContent = "Press Start Demo, Next Step, or click an API step.";
      metricRound.textContent = "0";
      metricLoss.textContent = "0.800";
      metricShots.textContent = "—";
      metricDecision.textContent = "Ready";

      endpointEl.textContent = "Ready";
      inspectorTitle.textContent = "Select a step";
      inspectorExplanation.textContent =
        "Choose a process step to inspect the endpoint, request, response, and agent decision.";
      requestJson.textContent = "{}";
      responseJson.textContent = "{}";
      return;
    }

    const step = apiSteps[currentStep];

    titleEl.textContent = step.title;
    descriptionEl.textContent = step.explanation;

    metricRound.textContent = step.round;
    metricLoss.textContent = step.loss;
    metricShots.textContent = step.shots;
    metricDecision.textContent = step.decision;

    endpointEl.textContent = step.endpoint;
    inspectorTitle.textContent = step.title;
    inspectorExplanation.textContent = step.explanation;
    requestJson.textContent = prettyJson(step.request);
    responseJson.textContent = prettyJson(step.response);
  }

  function goToStep(stepIndex) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    currentStep = Math.max(0, Math.min(stepIndex, apiSteps.length - 1));
    renderStep();
  }

  function nextDemoStep() {
    currentStep += 1;

    if (currentStep >= apiSteps.length) {
      currentStep = apiSteps.length - 1;
      clearInterval(timer);
      timer = null;
    }

    renderStep();
  }

  function startDemo() {
    resetDemo();
    nextDemoStep();

    timer = setInterval(() => {
      if (currentStep >= apiSteps.length - 1) {
        clearInterval(timer);
        timer = null;
        return;
      }

      nextDemoStep();
    }, 1800);
  }

  function resetDemo() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    currentStep = -1;
    renderStep();
  }

  startButton.addEventListener("click", startDemo);
  nextButton.addEventListener("click", nextDemoStep);
  resetButton.addEventListener("click", resetDemo);

  inspectorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      goToStep(Number(button.dataset.inspectStep));
    });
  });

  renderStep();
});
