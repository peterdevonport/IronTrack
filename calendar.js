import { auth, db, doc, getDoc, setDoc } from './firebase.js';
import { state, CONSISTENCY_CONFIG, activeDates, DAYS_IN_WEEK, CONSISTENCY_WINDOW_DAYS, PERCENT_DIVISOR } from './state.js';
import { toLocalDateKey, getMonday, countActiveDays, countConsecutiveDays } from './date.js';
import { buildCalendarDayHtml, renderCalendarWorkoutItem } from './rendering.js';
import { renderEmptyState, updateCalTodayBtnState, setChallengeCard } from './ui.js';

// ==========================================
// WORKOUT CONSISTENCY SYSTEM
// ==========================================

async function computeAndSyncDailyActivity() {
    if (!auth.currentUser) return;
    try {
        const allTimestamps = [];
        state.data.lastWorkouts.forEach(w => allTimestamps.push(w.timestamp));
        state.data.lastStructuredWorkouts.forEach(sw => allTimestamps.push(sw.timestamp));
        
        activeDates.clear();
        allTimestamps.forEach(ts => {
            const d = new Date(ts);
            activeDates.add(toLocalDateKey(d));
        });
        
        renderConsistencyUI();
    } catch (err) {
        console.error('computeAndSyncDailyActivity failed', err);
    }
}

function renderConsistencyUI() {
    renderCalendar();
    updateConsistencyMetrics();
    renderChallengeCards();
    const today = new Date();
    selectCalendarDay(toLocalDateKey(today));
}

function calculateChallengeProgress() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const dateArray = Array.from(activeDates);

    const monthlyActive = dateArray.filter(d => {
        const [y, m] = d.split('-');
        return parseInt(y) === currentYear && (parseInt(m) - 1) === currentMonth;
    }).length;

    const yearlyActive = dateArray.filter(d => {
        return d.startsWith(String(currentYear));
    }).length;

    const lifetimeActive = activeDates.size;

    // Add lifetime day0 offset from onboarding (cumulative seeding only)
    const day0 = state.user.userBiometrics?.day0TrainingDays || { monthly: 0, yearly: 0, lifetime: 0 };

    return { monthly: monthlyActive, yearly: yearlyActive, lifetime: lifetimeActive + (day0.lifetime || 0), monthlyRaw: monthlyActive, yearlyRaw: yearlyActive, lifetimeRaw: lifetimeActive };
}

function renderChallengeCards() {
    const progress = calculateChallengeProgress();
    const cfg = CONSISTENCY_CONFIG;

    const monthlyPct = Math.min(PERCENT_DIVISOR, (progress.monthly / cfg.monthlyUniqueDays) * PERCENT_DIVISOR);
    const yearlyPct = Math.min(PERCENT_DIVISOR, (progress.yearly / cfg.yearlyUniqueDays) * PERCENT_DIVISOR);
    const lifetimePct = Math.min(PERCENT_DIVISOR, (progress.lifetime / cfg.lifetimeUniqueDays) * PERCENT_DIVISOR);

    const monthlyDone = progress.monthlyRaw >= cfg.monthlyUniqueDays;
    const yearlyDone = progress.yearlyRaw >= cfg.yearlyUniqueDays;
    const lifetimeDone = progress.lifetime >= cfg.lifetimeUniqueDays;

    setChallengeCard('challenge-monthly', progress.monthly, cfg.monthlyUniqueDays, monthlyPct, monthlyDone);
    setChallengeCard('challenge-yearly', progress.yearly, cfg.yearlyUniqueDays, yearlyPct, yearlyDone);
    setChallengeCard('challenge-lifetime', progress.lifetime, cfg.lifetimeUniqueDays, lifetimePct, lifetimeDone);

    updateChallengeStreaks(monthlyDone, yearlyDone);
}

async function loadConsistencyConfig() {
    try {
        const docSnap = await getDoc(doc(db, "config", "consistency"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.monthlyUniqueDays) CONSISTENCY_CONFIG.monthlyUniqueDays = data.monthlyUniqueDays;
            if (data.yearlyUniqueDays) CONSISTENCY_CONFIG.yearlyUniqueDays = data.yearlyUniqueDays;
            if (data.lifetimeUniqueDays) CONSISTENCY_CONFIG.lifetimeUniqueDays = data.lifetimeUniqueDays;
        }
    } catch (e) {
        // Config doc may not exist or permission-denied; use defaults
    }
    renderChallengeCards();
}

function getPreviousPeriodId(periodId, type) {
    if (type === 'monthly') {
        const [y, m] = periodId.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return String(parseInt(periodId) - 1);
}

function calculateStreakFromPeriods(completedPeriods, type) {
    if (!completedPeriods || completedPeriods.length === 0) return 0;
    const sorted = [...completedPeriods].sort().reverse();
    let streak = 1;
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === getPreviousPeriodId(current, type)) {
            streak++;
            current = sorted[i];
        } else {
            break;
        }
    }
    return streak;
}

function renderStreakUI(monthlyStreak, yearlyStreak) {
    const monthlyEl = document.getElementById('challenge-monthly-streak');
    const yearlyEl = document.getElementById('challenge-yearly-streak');
    if (monthlyEl) {
        if (monthlyStreak > 0) {
            monthlyEl.textContent = `\u{1F525} ${monthlyStreak}-month streak`;
            monthlyEl.classList.remove('hidden');
        } else {
            monthlyEl.classList.add('hidden');
        }
    }
    if (yearlyEl) {
        if (yearlyStreak > 0) {
            yearlyEl.textContent = `\u{1F525} ${yearlyStreak}-year streak`;
            yearlyEl.classList.remove('hidden');
        } else {
            yearlyEl.classList.add('hidden');
        }
    }
}

async function updateChallengeStreaks(monthlyDone, yearlyDone) {
    if (!auth.currentUser) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = String(now.getFullYear());

    let updated = false;
    const monthly = { completedPeriods: [...state.user.userChallengeStreaks.monthly.completedPeriods], currentStreak: 0, bestStreak: state.user.userChallengeStreaks.monthly.bestStreak || 0 };
    const yearly = { completedPeriods: [...state.user.userChallengeStreaks.yearly.completedPeriods], currentStreak: 0, bestStreak: state.user.userChallengeStreaks.yearly.bestStreak || 0 };

    const cfg = CONSISTENCY_CONFIG;
    const dates = Array.from(activeDates);

    const prevMonthlyLen = monthly.completedPeriods.length;
    monthly.completedPeriods = monthly.completedPeriods.filter(p => {
        if (p === currentMonth) return monthlyDone;
        const [y, m] = p.split('-').map(Number);
        return dates.filter(d => {
            const [dy, dm] = d.split('-').map(Number);
            return dy === y && dm === m;
        }).length >= cfg.monthlyUniqueDays;
    });

    const prevYearlyLen = yearly.completedPeriods.length;
    yearly.completedPeriods = yearly.completedPeriods.filter(p => {
        if (p === currentYear) return yearlyDone;
        return dates.filter(d => d.startsWith(p)).length >= cfg.yearlyUniqueDays;
    });

    if (monthly.completedPeriods.length !== prevMonthlyLen || yearly.completedPeriods.length !== prevYearlyLen) {
        updated = true;
    }

    if (monthlyDone && !monthly.completedPeriods.includes(currentMonth)) {
        monthly.completedPeriods.push(currentMonth);
        updated = true;
    }
    if (yearlyDone && !yearly.completedPeriods.includes(currentYear)) {
        yearly.completedPeriods.push(currentYear);
        updated = true;
    }

    monthly.currentStreak = calculateStreakFromPeriods(monthly.completedPeriods, 'monthly');
    yearly.currentStreak = calculateStreakFromPeriods(yearly.completedPeriods, 'yearly');
    monthly.bestStreak = Math.max(monthly.bestStreak, monthly.currentStreak);
    yearly.bestStreak = Math.max(yearly.bestStreak, yearly.currentStreak);

    state.user.userChallengeStreaks = { monthly, yearly };

    renderStreakUI(monthly.currentStreak, yearly.currentStreak);

    if (updated) {
        try {
            await setDoc(doc(db, "profiles", auth.currentUser.uid), { challengeStreaks: state.user.userChallengeStreaks }, { merge: true });
        } catch (e) {
            console.error('Failed to sync challenge streaks', e);
        }
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const today = new Date();
    const todayStr = toLocalDateKey(today);

    let html = '';

    if (state.calendar.compact) {
        const monday = getMonday(today);
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
            label.textContent = `${shortMonthNames[monday.getMonth()]} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
        } else {
            label.textContent = `${shortMonthNames[monday.getMonth()]} ${monday.getDate()} – ${shortMonthNames[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;
        }

        for (let i = 0; i < DAYS_IN_WEEK; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = toLocalDateKey(date);
            const isActive = activeDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = state.calendar.selectedDate === dateStr;
            const isThisMonth = date.getMonth() === state.calendar.month.getMonth() && date.getFullYear() === state.calendar.month.getFullYear();
            html += buildCalendarDayHtml(dateStr, date.getDate(), isActive, isToday, isSelected, isThisMonth);
        }
    } else {
        const year = state.calendar.month.getFullYear();
        const month = state.calendar.month.getMonth();

        label.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        let startDay = firstDay.getDay() - 1;
        if (startDay < 0) startDay = 6;

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < startDay; i++) {
            html += '<div class="cal-day cal-day-empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isActive = activeDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = state.calendar.selectedDate === dateStr;
            html += buildCalendarDayHtml(dateStr, day, isActive, isToday, isSelected);
        }

        const totalCells = startDay + daysInMonth;
        const remainingCells = (DAYS_IN_WEEK - (totalCells % DAYS_IN_WEEK)) % DAYS_IN_WEEK;
        for (let i = 0; i < remainingCells; i++) {
            html += '<div class="cal-day cal-day-empty"></div>';
        }
    }

    grid.innerHTML = html;
    updateCalTodayBtnState();
}

function updateConsistencyMetrics() {
    const today = new Date();
    const d7 = countActiveDays(7, today, activeDates);
    const d28 = countActiveDays(CONSISTENCY_WINDOW_DAYS, today, activeDates);
    
    const el7 = document.getElementById('consistency-7day');
    const el28 = document.getElementById('consistency-28day');
    const bar7 = document.getElementById('consistency-7day-bar');
    const bar28 = document.getElementById('consistency-28day-bar');
    const streak7 = document.getElementById('consistency-7day-streak');
    const streak28 = document.getElementById('consistency-28day-streak');
    
    if (el7) el7.textContent = `${d7} / ${DAYS_IN_WEEK}`;
    if (el28) el28.textContent = `${d28} / ${CONSISTENCY_WINDOW_DAYS}`;
    if (bar7) { bar7.style.width = `${Math.min(PERCENT_DIVISOR, (d7 / DAYS_IN_WEEK) * PERCENT_DIVISOR)}%`; bar7.setAttribute('aria-valuenow', Math.min(PERCENT_DIVISOR, Math.round((d7 / DAYS_IN_WEEK) * PERCENT_DIVISOR))); }
    if (bar28) { bar28.style.width = `${Math.min(PERCENT_DIVISOR, (d28 / CONSISTENCY_WINDOW_DAYS) * PERCENT_DIVISOR)}%`; bar28.setAttribute('aria-valuenow', Math.min(PERCENT_DIVISOR, Math.round((d28 / CONSISTENCY_WINDOW_DAYS) * PERCENT_DIVISOR))); }
    
    const streak = countConsecutiveDays(today, activeDates);
    if (streak7) {
        if (streak > 1) {
            streak7.textContent = `\u{1F525} ${streak}-day streak`;
            streak7.classList.remove('hidden');
        } else {
            streak7.classList.add('hidden');
        }
    }
    if (streak28) {
        if (streak > 1) {
            streak28.textContent = `\u{1F525} ${streak}-day streak`;
            streak28.classList.remove('hidden');
        } else {
            streak28.classList.add('hidden');
        }
    }
}

function getWorkoutsForDate(dateStr) {
    const results = [];
    
    function addIfMatches(item) {
        const d = new Date(item.timestamp);
        if (toLocalDateKey(d) === dateStr) results.push(item);
    }
    
    state.data.lastWorkouts.forEach(addIfMatches);
    state.data.lastStructuredWorkouts.forEach(addIfMatches);
    
    results.sort((a, b) => a.timestamp - b.timestamp);
    return results;
}

function selectCalendarDay(dateStr) {
    state.calendar.selectedDate = dateStr;
    renderCalendar();
    
    const detail = document.getElementById('cal-day-detail');
    const dateLabel = document.getElementById('cal-day-detail-date');
    const workoutsContainer = document.getElementById('cal-day-workouts');
    
    if (!detail || !dateLabel || !workoutsContainer) return;
    
    detail.classList.remove('hidden');
    
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    dateLabel.textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const items = getWorkoutsForDate(dateStr);
    
    if (items.length === 0) {
        renderEmptyState(workoutsContainer, 'No workouts logged this day.');
        return;
    }
    
    workoutsContainer.innerHTML = items.map(item => renderCalendarWorkoutItem(item)).join('');
}

function changeCalendarNav(delta) {
    const inner = document.getElementById('cal-grid-inner');
    if (!inner) {
        applyCalendarNav(delta);
        renderCalendar();
        return;
    }
    const outClass = delta > 0 ? 'slide-out-left' : 'slide-out-right';
    const inClass = delta > 0 ? 'slide-in-left' : 'slide-in-right';
    inner.classList.add(outClass);
    inner.addEventListener('animationend', function handlerOut() {
        inner.removeEventListener('animationend', handlerOut);
        inner.classList.remove(outClass);
        applyCalendarNav(delta);
        renderCalendar();
        inner.classList.add(inClass);
        inner.addEventListener('animationend', function handlerIn() {
            inner.removeEventListener('animationend', handlerIn);
            inner.classList.remove(inClass);
        }, { once: true });
    }, { once: true });
}

function applyCalendarNav(delta) {
    if (state.calendar.compact) {
        state.calendar.weekOffset += delta;
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        state.calendar.month = new Date(monday);
    } else {
        state.calendar.month.setMonth(state.calendar.month.getMonth() + delta);
    }
    state.calendar.selectedDate = null;
    const detail = document.getElementById('cal-day-detail');
    if (detail) detail.classList.add('hidden');
    autoSelectFirstActiveDay();
}

function autoSelectFirstActiveDay() {
    if (activeDates.size === 0) return;
    let startDate, endDate;
    if (state.calendar.compact) {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        startDate = new Date(monday);
        endDate = new Date(monday);
        endDate.setDate(endDate.getDate() + 6);
    } else {
        const year = state.calendar.month.getFullYear();
        const month = state.calendar.month.getMonth();
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
    }
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateKey(d);
        if (activeDates.has(dateStr)) {
            selectCalendarDay(dateStr);
            return;
        }
    }
}

function goToCalendarToday() {
    state.calendar.weekOffset = 0;
    state.calendar.month = new Date();
    const now = new Date();
    selectCalendarDay(toLocalDateKey(now));
}

function toggleCalendarView() {
    state.calendar.compact = !state.calendar.compact;
    if (state.calendar.compact) {
        state.calendar.weekOffset = 0;
        const monday = getMonday(new Date());
        state.calendar.month = new Date(monday);
    } else {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + state.calendar.weekOffset * 7);
        state.calendar.month = new Date(monday);
    }
    const btn = document.getElementById('cal-toggle-view');
    if (btn) btn.textContent = state.calendar.compact ? 'Month View ▽' : 'Week View △';
    renderCalendar();
}

function closeCalendarDayDetail() {
    state.calendar.selectedDate = null;
    const detail = document.getElementById('cal-day-detail');
    if (detail) detail.classList.add('hidden');
    renderCalendar();
}


export { computeAndSyncDailyActivity, renderConsistencyUI, calculateChallengeProgress, renderChallengeCards, loadConsistencyConfig, getPreviousPeriodId, calculateStreakFromPeriods, renderStreakUI, updateChallengeStreaks, renderCalendar, updateConsistencyMetrics, getWorkoutsForDate, selectCalendarDay, changeCalendarNav, applyCalendarNav, autoSelectFirstActiveDay, goToCalendarToday, toggleCalendarView, closeCalendarDayDetail };
