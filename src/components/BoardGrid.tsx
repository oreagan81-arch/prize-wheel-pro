import { useBoardStore } from '@/store/boardStore';
import { BoardTile } from './BoardTile';
import { motion } from 'framer-motion';

export const BoardGrid = () => {
  const tiles = useBoardStore((s) => s.tiles);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="grid grid-cols-10 gap-1.5 sm:gap-2 p-2 sm:p-4"
    >
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.008, duration: 0.3 }}
        >
          <BoardTile tile={tile} />
        </motion.div>
      ))}
    </motion.div>
  );
};
