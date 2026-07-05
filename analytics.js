import { formatMovementWeight, formatWorkoutType } from './utils.js';

function computeDotsScore(squatRec, benchRec, deadliftRec, bw, gender) {
  const plTotal = squatRec + benchRec + deadliftRec;
  if (plTotal <= 0 || bw <= 0) return { dots: 0, plTotal: 0 };

  const c = gender === 'male'
    ? [47.46178854, 8.472061379, -0.07369410346, 0.0002586110512, -0.0000003634089054, 0.000000001790898013]
    : [-125.4255398, 13.71219419, -0.03307250631, 0.00004809990691, -0.00000003622531999, 0.000000000105123006];

  const denominator = c[0] + (c[1] * bw) + (c[2] * Math.pow(bw, 2)) + (c[3] * Math.pow(bw, 3)) + (c[4] * Math.pow(bw, 4)) + (c[5] * Math.pow(bw, 5));
  return { dots: (plTotal * 500) / denominator, plTotal };
}

function computeSinclairScore(snatchRec, cleanRec, bw, gender) {
  const olyTotal = snatchRec + cleanRec;
  if (olyTotal <= 0 || bw <= 0) return { sinclair: 0, olyTotal: 0 };

  const A = gender === 'male' ? 0.722762521 : 0.787004341;
  const b = gender === 'male' ? 193.609 : 153.757;
  if (bw >= b) return { sinclair: olyTotal, olyTotal };

  const coeff = Math.pow(10, A * Math.pow(Math.log10(bw / b), 2));
  return { sinclair: olyTotal * coeff, olyTotal };
}

function getRankingTier(score, system, gender) {
    if (score <= 0) return "-";
    if (system === 'dots') {
        const cutoff = gender === 'male' ? [300, 400, 500] : [250, 325, 425];
        if (score < cutoff[0]) return "Beginner";
        if (score < cutoff[1]) return "Intermediate";
        if (score < cutoff[2]) return "Advanced";
        return "Elite";
    } else {
        if (score < 250) return "Beginner";
        if (score < 320) return "Intermediate";
        if (score < 400) return "Advanced";
        if (score < 450) return "Elite";
        return "World Class";
    }
}

function formatScore_ROUNDS_AND_REPS(rounds, additionalReps) {
  const r = String(rounds ?? '').trim();
  const a = String(additionalReps ?? '').trim();
  if ((r === '0' || r === '') && (a === '0' || a === '')) return '—';
  return `${r}+${a}`;
}

function formatScore_COMPLETED_MINUTES(completed, total) {
  if (completed === 0 && total === 0) return '—';
  return `${completed}/${total}`;
}

function formatScore_TIME_SECONDS(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return '—';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function describeAmrap(structure) {
  const mins = Math.round((structure.durationSeconds || 0) / 60);
  const lines = [`${mins}:00`];
  (structure.movements || []).forEach(m =>
    lines.push(`\u2022 ${m.reps || '?'}x ${m.movement}${formatMovementWeight(m)}`)
  );
  return lines.join('<br>');
}

function describeEmom(structure) {
  const lines = [];
  const totalSec = structure.intervalSeconds || 0;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const isStandardEmom = totalSec === 60;
  if (!isStandardEmom) {
    lines.push(`Every ${mins}:${String(secs).padStart(2, '0')} min \u00D7 ${structure.rounds || 0} rounds`);
  } else {
    lines.push(`\u00D7 ${structure.rounds || 0} rounds`);
  }
  (structure.minutes || []).forEach((m, i) => {
    const mov = m.movements?.[0];
    if (mov) lines.push(`Round ${i + 1}: ${mov.reps || '?'}x ${mov.exerciseId || ''}${formatMovementWeight(mov)}`);
  });
  return lines.join('<br>');
}

function describeForTime(structure) {
  const lines = [];
  const parts = [];
  if (structure.durationMinutes) parts.push(`${structure.durationMinutes}:00 cap`);
  parts.push(`${structure.rounds || 0} rounds`);
  lines.push(parts.join(' \u00B7 '));
  const uniqueMovements = structure.movements || [];
  if (uniqueMovements.length) {
    lines.push('Each round:');
    uniqueMovements.forEach(m =>
      lines.push(`  ${m.reps || '?'}x ${m.movement}${formatMovementWeight(m)}`)
    );
  }
  return lines.join('<br>');
}

function describeInterval(structure) {
  const lines = [];
  const wMin = Math.floor((structure.workSeconds || 0) / 60);
  const rMin = Math.floor((structure.restSeconds || 0) / 60);
  lines.push(`Work ${wMin}:00 \u00B7 Rest ${rMin}:00 \u00B7 ${structure.rounds || 0} rounds`);
  (structure.movements || []).forEach(m =>
    lines.push(`  ${m.reps || '?'}x ${m.movement}${formatMovementWeight(m)}`)
  );
  return lines.join('<br>');
}

function buildWorkoutDescription(workout) {
  const { type, structure } = workout;
  switch (type) {
    case 'AMRAP': return describeAmrap(structure);
    case 'EMOM': return describeEmom(structure);
    case 'FOR_TIME': return describeForTime(structure);
    case 'INTERVAL': return describeInterval(structure);
    default: return '';
  }
}

function buildWorkoutSummaryLine(type, structure) {
  switch (type) {
    case 'AMRAP': {
      const mins = Math.round((structure.durationSeconds || 0) / 60);
      return `As Many Rounds As Possible in ${mins}:00 mins`;
    }
    case 'EMOM': {
      const rounds = structure.rounds || 0;
      const intervalSec = structure.intervalSeconds || 60;
      const mins = Math.floor(intervalSec / 60);
      const secs = intervalSec % 60;
      return `Every ${mins}:${String(secs).padStart(2, '0')} x ${rounds} rounds`;
    }
    case 'FOR_TIME': {
      const cap = structure.durationMinutes;
      const rounds = structure.rounds;
      const parts = [];
      if (cap) parts.push(`${cap} min cap`);
      if (rounds) parts.push(`${rounds} rounds`);
      return parts.join(' \u00B7 ');
    }
    case 'INTERVAL': {
      const ws = structure.workSeconds || 0;
      const rs = structure.restSeconds || 0;
      const wrk = `${Math.floor(ws / 60)}:${(ws % 60).toString().padStart(2, '0')}`;
      const rst = `${Math.floor(rs / 60)}:${(rs % 60).toString().padStart(2, '0')}`;
      const rds = structure.rounds || 0;
      return `Work ${wrk} \u00B7 Rest ${rst} \u00B7 ${rds} rounds`;
    }
    default: return '';
  }
}

function getRepsPerRound(type, structure) {
  if (type === 'EMOM') {
    const firstMin = structure?.minutes?.[0];
    if (!firstMin) return 0;
    return (firstMin.movements || []).reduce((sum, m) => sum + (parseInt(m.reps, 10) || 0), 0);
  }
  return (structure?.movements || []).reduce((sum, m) => sum + (parseInt(m.reps, 10) || 0), 0);
}

export { computeDotsScore, computeSinclairScore, getRankingTier, formatScore_ROUNDS_AND_REPS, formatScore_COMPLETED_MINUTES, formatScore_TIME_SECONDS, describeAmrap, describeEmom, describeForTime, describeInterval, buildWorkoutDescription, buildWorkoutSummaryLine, getRepsPerRound };
