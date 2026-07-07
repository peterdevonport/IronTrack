import { onboardingView, appView, bottomNav, onboardingExerciseSelect, onboardingWeightInput, onboardingRepsInput } from './state.js';
import { showFeedback, buildExerciseOptionsHtml } from './ui.js';
import { renderOnboarding1RMList } from './rendering.js';

function showOnboarding(pendingItems) {
    onboardingView.classList.remove('hidden');
    const groups = ['barbell', 'dumbbell', 'kettlebell', 'cardio', 'bodyweight'];
    if (onboardingExerciseSelect) {
        onboardingExerciseSelect.innerHTML = buildExerciseOptionsHtml(groups, '<option value="" disabled selected>Select exercise...</option>');
    }
    pendingItems.length = 0;
    renderOnboarding1RMList(pendingItems);
}

function hideOnboarding() {
    onboardingView.classList.add('hidden');
    appView.classList.remove('hidden');
    if (bottomNav) bottomNav.classList.remove('hidden');
}

function addOnboarding1RM(pendingItems) {
    const exercise = onboardingExerciseSelect?.value;
    const weight = parseFloat(onboardingWeightInput?.value);
    const reps = parseInt(onboardingRepsInput?.value, 10) || 1;

    if (!exercise) {
        showFeedback('Please select an exercise.', 'red', 'onboarding-feedback');
        return;
    }
    if (!weight || weight <= 0) {
        showFeedback('Please enter a valid weight.', 'red', 'onboarding-feedback');
        return;
    }
    if (pendingItems.some(item => item.exercise === exercise)) {
        showFeedback('Exercise already added. Remove it first to re-enter.', 'red', 'onboarding-feedback');
        return;
    }

    pendingItems.push({ exercise, weight, reps });
    renderOnboarding1RMList(pendingItems);

    onboardingExerciseSelect.value = '';
    onboardingWeightInput.value = '';
    onboardingRepsInput.value = '1';
    document.getElementById('onboarding-feedback').textContent = '';
}

export { showOnboarding, hideOnboarding, addOnboarding1RM };
