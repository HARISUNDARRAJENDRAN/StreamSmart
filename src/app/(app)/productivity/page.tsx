'use client';

import { motion } from 'framer-motion';
import ProductivityTimer from '@/components/dashboard/productivity-timer';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function ProductivityPage() {
  return (
    <>
      {/* Overlay that covers the main content area completely */}
      <div className="absolute inset-0 bg-black overflow-hidden z-50 -m-4 sm:-m-6 lg:-m-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="h-full w-full"
        >
          {/* Productivity Timer Component - Full screen */}
          <motion.div
            variants={fadeInUp}
            transition={{ delay: 0.3 }}
            className="h-full w-full"
          >
            <ProductivityTimer />
          </motion.div>
        </motion.div>
      </div>
    </>
  );
} 