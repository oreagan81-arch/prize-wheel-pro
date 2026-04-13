

## Issues Found

### 1. Prize Reveal Overlay Disappears Instantly
When a tile is clicked, `revealTile()` is called (line 148) which changes `tile.state` from `'assigned'` to `'revealed'`. This causes the component to re-render and hit the `tile.state === 'revealed'` branch (line 253), which does NOT render the `PrizeRevealOverlay`. The overlay mounts for a frame then vanishes — you see confetti but no prize popup.

**Fix**: Move the `PrizeRevealOverlay` and bomb overlay rendering OUTSIDE the conditional tile-state blocks, so they persist regardless of tile state changes.

### 2. Whammy Trap Reveals Immediately
The current flow checks `tile.isTrap` on line 138 BEFORE showing any prize. Students immediately see "WHAMMY TRAP!" with the warning icon — no suspense.

**Fix**: Rework the whammy flow to be a multi-phase experience:
1. **Phase 1 — Prize Reveal**: Show the prize normally with confetti and celebration (e.g., "🍕 Lunch with Friend!"). Student thinks they won.
2. **Phase 2 — Reagan Warnings**: After 2-3 seconds, Reagan's warnings start appearing. Screen pulses red, ominous sounds play. Text like "Wait... Reagan senses something..." then "Reagan is reaching for your prize!"
3. **Phase 3 — Whammy Strike**: After the 10s timer expires, Reagan devours the prize with the taunt and consolation.

## Changes

### `src/components/BoardTile.tsx`
- Move `PrizeRevealOverlay` and bomb overlay renders to the TOP of the component return (before any tile-state conditionals), wrapped in portals/fragments so they show regardless of tile state.
- Rework whammy logic into phases: `'celebrate'` → `'warning'` → `'trapped'`
  - On click of a trap tile: call `revealTile`, show confetti + prize overlay like normal
  - After ~3s delay: transition to warning phase (close prize overlay, show whammy modal with Reagan warnings escalating)
  - After 10s countdown: Reagan devours the prize, shows taunt + consolation
- Update the whammy overlay to show the fake prize during the warning phase with escalating Reagan quotes

### `src/components/PrizeRevealOverlay.tsx`
- No changes needed — it works correctly, just needs to stay mounted.

### Technical Detail
The key structural fix is changing from:
```
if (tile.state === 'assigned') {
  return (<>
    <tile markup/>
    {showReveal && <PrizeRevealOverlay/>}
  </>)
}
if (tile.state === 'revealed') {
  return <revealed markup/>  // ← overlay gone!
}
```
To:
```
return (<>
  {showReveal && <PrizeRevealOverlay/>}
  {showBomb && <BombOverlay/>}
  {whammyActive && <WhammyOverlay/>}
  {/* then tile state rendering */}
  {tile.state === 'revealed' ? <revealed/> : tile.state === 'assigned' ? <assigned/> : <empty/>}
</>)
```

