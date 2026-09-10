/**
 * The five departments, as a type.
 *
 * This is the contract between the office scene and the shell: `DEPTS` in
 * RealFloor3D.tsx keys its plates by these ids, and `DEPT_COPY` in
 * OwnerShell.tsx keys its page copy by the same ones, so a plate can never
 * open a page that does not exist. That guarantee is the whole reason the
 * type lives in its own file rather than inside either of them.
 *
 * It used to live in AgentOffice.tsx, a scene that had stopped being
 * rendered; the type was the only thing still imported out of it.
 *
 * Adding one here is not enough on its own — a new department needs a
 * plate, page copy, and a locked ground colour in `domain` (tokens.ts),
 * and the design doc's Section 2 wants the colour logged before it ships.
 */
export type PlatformId =
  | 'suppliers'
  | 'finance'
  | 'admin'
  | 'marketing'
  | 'roster'
