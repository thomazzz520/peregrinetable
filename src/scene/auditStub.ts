/**
 * A placeholder `window.__auditScene()` for before there is a scene to audit.
 *
 * The real one is installed by `FloorPlan`'s `onCreated` and closes over that
 * canvas's scene and camera, so it cannot exist until a floor plan has
 * mounted. Called on any other page, an unstubbed `__auditScene` is simply
 * `undefined`, which reads as "the checks are missing" rather than "the room
 * isn't up yet". This says which it is, and what to do about it.
 *
 * Dev-only, and deliberately replaced rather than merged: once `FloorPlan`
 * assigns the real function this one is gone.
 */
export function installAuditStub(): void {
  if (!import.meta.env.DEV) return
  const w = window as unknown as Record<string, unknown>
  if (w.__auditScene) return
  w.__auditScene = () =>
    'No floor plan is mounted, so there is no scene to audit. Open /book and ' +
    'submit the gate — party size, date and time — which is what mounts the ' +
    'room; __auditScene() is replaced with the real checks when it does.'
}
