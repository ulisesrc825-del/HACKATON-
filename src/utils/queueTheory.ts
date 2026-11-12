/**
 * Mathematical queueing theory models (M/M/c and Split-Lane Reengineering)
 * Used to model warehouse service windows during peak academic hours (09:00, 11:00, 13:00)
 */

export interface QueueModelResults {
  utilization: number; // rho
  avgQueueLength: number; // Lq (users in line)
  avgWaitTimeMinutes: number; // Wq (minutes in queue)
  avgTotalTimeMinutes: number; // W (total minutes in system)
  avgSystemUsers: number; // L (users in system)
  isStable: boolean;
  serviceCapacityPerHour: number;
}

export function calculateMMcQueue(
  arrivalRatePerHour: number, // lambda
  serviceTimeMinutes: number, // 1/mu in minutes
  servers: number = 2 // c (2 technicians)
): QueueModelResults {
  if (arrivalRatePerHour <= 0 || serviceTimeMinutes <= 0 || servers <= 0) {
    return {
      utilization: 0,
      avgQueueLength: 0,
      avgWaitTimeMinutes: 0,
      avgTotalTimeMinutes: 0,
      avgSystemUsers: 0,
      isStable: true,
      serviceCapacityPerHour: 0,
    };
  }

  const mu = 60 / serviceTimeMinutes; // users served per hour per server
  const totalCapacity = servers * mu;
  const rho = arrivalRatePerHour / totalCapacity;

  // If arrival rate exceeds capacity, system is over-saturated (unstable queue in peak hour)
  if (rho >= 0.99) {
    // Transient accumulation over peak hour (60 min peak)
    const excessArrivals = arrivalRatePerHour - totalCapacity;
    const accumulatedQueue = Math.max(2, Math.round(excessArrivals * 0.85 + (arrivalRatePerHour * 0.3)));
    const waitTime = (accumulatedQueue / totalCapacity) * 60 + serviceTimeMinutes;

    return {
      utilization: Number(rho.toFixed(2)),
      avgQueueLength: accumulatedQueue,
      avgWaitTimeMinutes: Number(waitTime.toFixed(1)),
      avgTotalTimeMinutes: Number((waitTime + serviceTimeMinutes).toFixed(1)),
      avgSystemUsers: accumulatedQueue + servers,
      isStable: false,
      serviceCapacityPerHour: Number(totalCapacity.toFixed(1)),
    };
  }

  // Standard Erlang C / M/M/c calculation
  const a = arrivalRatePerHour / mu; // offered load

  // Compute P0
  let sum = 0;
  for (let n = 0; n < servers; n++) {
    sum += Math.pow(a, n) / factorial(n);
  }
  const lastTerm = Math.pow(a, servers) / (factorial(servers) * (1 - rho));
  const p0 = 1 / (sum + lastTerm);

  // Lq (Queue length)
  const lq = (p0 * Math.pow(a, servers) * rho) / (factorial(servers) * Math.pow(1 - rho, 2));
  
  // Wq = Lq / lambda (in hours -> convert to minutes)
  const wqMinutes = (lq / arrivalRatePerHour) * 60;
  const wMinutes = wqMinutes + serviceTimeMinutes;
  const l = lq + a;

  return {
    utilization: Number(rho.toFixed(2)),
    avgQueueLength: Number(lq.toFixed(1)),
    avgWaitTimeMinutes: Number(wqMinutes.toFixed(1)),
    avgTotalTimeMinutes: Number(wMinutes.toFixed(1)),
    avgSystemUsers: Number(l.toFixed(1)),
    isStable: true,
    serviceCapacityPerHour: Number(totalCapacity.toFixed(1)),
  };
}

export function calculateReengineeredDualLane(
  arrivalRatePerHour: number,
  fastTrackAdoptionRate: number = 0.78, // % students with smartphone/QR pre-reservation
  fastTrackServiceMinutes: number = 0.4, // 24 seconds with pre-assembled kit
  standardServiceMinutes: number = 1.2 // 1.2 minutes for ad-hoc / consultation
): {
  fastTrack: QueueModelResults;
  standardLane: QueueModelResults;
  weightedWaitTimeMinutes: number;
  totalQueueLength: number;
  combinedCapacityPerHour: number;
} {
  const lambdaFast = arrivalRatePerHour * fastTrackAdoptionRate;
  const lambdaStandard = arrivalRatePerHour * (1 - fastTrackAdoptionRate);

  // 1 technician dedicated to Fast-Track
  const fastTrack = calculateMMcQueue(lambdaFast, fastTrackServiceMinutes, 1);
  // 1 technician dedicated to Standard Lane / Returns & Testing
  const standardLane = calculateMMcQueue(lambdaStandard, standardServiceMinutes, 1);

  const weightedWait =
    fastTrackAdoptionRate * fastTrack.avgWaitTimeMinutes +
    (1 - fastTrackAdoptionRate) * standardLane.avgWaitTimeMinutes;

  return {
    fastTrack,
    standardLane,
    weightedWaitTimeMinutes: Number(weightedWait.toFixed(1)),
    totalQueueLength: Number((fastTrack.avgQueueLength + standardLane.avgQueueLength).toFixed(1)),
    combinedCapacityPerHour: Number((fastTrack.serviceCapacityPerHour + standardLane.serviceCapacityPerHour).toFixed(1)),
  };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}
