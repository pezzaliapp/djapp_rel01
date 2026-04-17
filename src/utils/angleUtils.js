/**
 * angleUtils — geometria per il jog wheel
 */

/**
 * Calcola l'angolo in gradi di un punto (x, y) rispetto al centro (cx, cy).
 * Ritorna un valore 0–360 in senso orario dal top.
 */
export function getAngleDeg(x, y, cx, cy) {
  const dx = x - cx
  const dy = y - cy
  // atan2 ritorna -PI...PI, 0 = destra. Ruotiamo per avere 0 = top.
  const radians = Math.atan2(dy, dx) - Math.PI / 2
  let deg = radians * (180 / Math.PI)
  if (deg < 0) deg += 360
  return deg
}

/**
 * Calcola il delta angolare tra due angoli (in gradi),
 * gestendo il wrap-around (es. da 358° a 2° = +4°, non -356°).
 */
export function angleDelta(prev, next) {
  let delta = next - prev

  // Normalizza nell'intervallo [-180, 180]
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360

  return delta
}

/**
 * Calcola le coordinate del centro di un elemento DOM.
 */
export function getElementCenter(element) {
  const rect = element.getBoundingClientRect()
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
  }
}

/**
 * Normalizza la velocità di scratch in base al delta angolare
 * e alla velocità di movimento (px/ms).
 *
 * @param {number} deltaAngle - delta angolo in gradi
 * @param {number} deltaTime  - tempo trascorso in ms
 * @returns {{ scratchRate: number, direction: 1|-1 }}
 */
export function computeScratchRate(deltaAngle, deltaTime) {
  if (deltaTime <= 0) return { scratchRate: 1.0, direction: 1 }

  // Velocità angolare in deg/ms
  const angularVelocity = Math.abs(deltaAngle) / deltaTime

  // Mappa velocità → playback rate
  // 0 deg/ms → 0.0, 2 deg/ms → 1.0 (normale), 10 deg/ms → 4.0 (veloce)
  const scratchRate = Math.min(angularVelocity / 2, 8.0)
  const direction = deltaAngle >= 0 ? 1 : -1

  return { scratchRate, direction }
}
