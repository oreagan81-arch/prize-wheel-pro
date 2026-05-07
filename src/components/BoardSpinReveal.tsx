import { useBoardStore } from '@/store/boardStore';
import { PrizeRevealOverlay } from './PrizeRevealOverlay';

/**
 * Bridges the board-spin "revealing" state to the PrizeRevealOverlay.
 * When boardSpinMode === 'revealing', shows the prize for the highlighted tile.
 * Closing the overlay returns the board to idle.
 */
export const BoardSpinReveal = () => {
  const boardSpinMode = useBoardStore((s) => s.boardSpinMode);
  const highlightedTileId = useBoardStore((s) => s.highlightedTileId);
  const tiles = useBoardStore((s) => s.tiles);
  const masterPrizes = useBoardStore((s) => s.masterPrizes);
  const resetSpinMode = useBoardStore((s) => s.resetSpinMode);
  const revealTile = useBoardStore((s) => s.revealTile);

  if (boardSpinMode !== 'revealing' || highlightedTileId == null) return null;

  const tile = tiles.find((t) => t.id === highlightedTileId);
  if (!tile) return null;

  const prizeName = tile.prize || '🎁 Surprise';
  const emojiMatch = prizeName.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
  const emoji = emojiMatch ? emojiMatch[0] : '🎁';
  const prizeDef = masterPrizes.find((p) => p.name === prizeName);

  const handleClose = () => {
    // Mark tile as revealed when closing the overlay
    if (tile.state !== 'revealed') revealTile(tile.id, prizeName);
    resetSpinMode();
  };

  return (
    <PrizeRevealOverlay
      open
      onClose={handleClose}
      prizeName={prizeName}
      prizeEmoji={emoji}
      studentName={tile.studentName || ''}
      isRare={prizeDef?.rarity === 'rare' || prizeDef?.rarity === 'legendary'}
      prize={prizeDef}
    />
  );
};
