import { ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Fade + subtle slide up animation
const fadeSlideVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// Scale + fade for modal-like pages
const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.2,
    },
  },
};

// Slide from right for nested pages
const slideRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export type TransitionType = 'fade' | 'scale' | 'slide';

const variantsMap: Record<TransitionType, Variants> = {
  fade: fadeSlideVariants,
  scale: scaleVariants,
  slide: slideRightVariants,
};

interface AnimatedPageProps extends PageTransitionProps {
  type?: TransitionType;
}

export function PageTransition({ 
  children, 
  className,
  type = 'fade' 
}: AnimatedPageProps) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={variantsMap[type]}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Simple wrapper without location key (for content transitions)
export function AnimatedContent({ 
  children, 
  className,
  type = 'fade' 
}: AnimatedPageProps) {
  return (
    <motion.div
      variants={variantsMap[type]}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

export function StaggeredList({ 
  children, 
  className,
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  );
}

// Individual staggered item
export function StaggeredItem({ 
  children, 
  className 
}: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      variants={staggerItemVariants}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
