document.addEventListener("DOMContentLoaded", () => {
  const demoSteps = [
    {
      title: "Goal received",
      description:
        "The user submits an autonomous optimisation goal, initial diagnostics, safety constraints, and executor settings.",
      round: 0,
      loss: "0.800",
      shots: "—",
      decision: "Initialising"
    },
    {
      title: "Strategy schema loaded",
      description:
        "The API loads the strategy schema to identify required diagnostics and bounded control variables.",
      round: 0,
      loss: "0.800",
      shots: "—",
      decision: "Schema ready"
    },
    {
      title: "Controller created",
      description:
        "The controller factory creates a classical, quantum, or hybrid deep-unfolded controller instance.",
      round: 0,
      loss: "0.800",
      shots: "—",
      decision: "Controller ready"
    },
    {
      title: "Controls suggested",
      description:
        "The controller maps diagnostics to bounded controls such as theta learning rate, shots, and circuit depth.",
      round: 1,
      loss: "0.755",
      shots: "3223",
      decision: "Controls proposed"
    },
    {
      title: "Controlled round executed",
      description:
        "The executor applies the suggested controls and returns training loss, validation loss, reward, and next diagnostics.",
      round: 1,
      loss: "0.755",
      shots: "3223",
      decision: "Feedback received"
    },
    {
      title: "Controller updated",
      description:
        "The update-controller endpoint uses feedback to improve future control suggestions.",
      round: 2,
      loss: "0.702",
      shots: "3809",
      decision: "Learning"
    },
    {
      title: "Continue or stop decision",
      description:
        "The evaluator checks progress against the goal and decides whether to continue, stop, or save the best result.",
      round: 3,
      loss: "0.650",
      shots: "4096",
      decision: "Continue"
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

  const activeElements = document.querySelectorAll("[data-step]");

  if (
    !startButton ||
    !nextButton ||
    !resetButton ||
    !titleEl ||
    !descriptionEl ||
    !metricRound ||
    !metricLoss ||
    !metricShots ||
    !metricDecision
  ) {
    console.error(
      "DeepUnfolding demo error: one or more required HTML elements are missing. Check button IDs and metric IDs."
    );
    return;
  }

  function renderStep() {
    activeElements.forEach((element) => {
      const step = Number(element.dataset.step);

      element.classList.remove("is-active");
      element.classList.remove("is-complete");

      if (step < currentStep) {
        element.classList.add("is-complete");
      }

      if (step === currentStep) {
        element.classList.add("is-active");
      }
    });

    if (currentStep < 0) {
      titleEl.textContent = "Ready";
      descriptionEl.textContent = "Press Start Demo to animate the API process.";
      metricRound.textContent = "0";
      metricLoss.textContent = "0.800";
      metricShots.textContent = "—";
      metricDecision.textContent = "Ready";
      return;
    }

    const stepData = demoSteps[currentStep];

    titleEl.textContent = stepData.title;
    descriptionEl.textContent = stepData.description;
    metricRound.textContent = stepData.round;
    metricLoss.textContent = stepData.loss;
    metricShots.textContent = stepData.shots;
    metricDecision.textContent = stepData.decision;
  }

  function nextDemoStep() {
    currentStep += 1;

    if (currentStep >= demoSteps.length) {
      currentStep = demoSteps.length - 1;
      clearInterval(timer);
      timer = null;
    }

    renderStep();
  }

  function startDemo() {
    resetDemo();
    nextDemoStep();

    timer = setInterval(() => {
      if (currentStep >= demoSteps.length - 1) {
        clearInterval(timer);
        timer = null;
        return;
      }

      nextDemoStep();
    }, 1500);
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

  renderStep();
});
