import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// Cinematic, heavy, premium standard easing
export const EASE = [0.16, 1, 0.3, 1];
export const DURATION = 0.8;

export function Reveal({ children, delay = 0, y = 40, blur = 8, scale = 0.98, className = "", once = true }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once, margin: "-10% 0px" });
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y, filter: `blur(${blur}px)`, scale }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 } : { opacity: 0, y, filter: `blur(${blur}px)`, scale }}
            transition={{ duration: DURATION, ease: EASE, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

const staggerContainerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0 }
    }
};

const staggerItemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98, filter: "blur(4px)" },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: DURATION,
            ease: EASE
        }
    }
};

export function StaggerContainer({ children, className = "", delay = 0, once = true }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once, margin: "-10% 0px" });
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) return <div className={className}>{children}</div>;

    return (
        <motion.div
            ref={ref}
            variants={staggerContainerVariants}
            initial="hidden"
            animate={isInView ? "show" : "hidden"}
            className={className}
            style={{ '--stagger-delay': delay }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className = "" }) {
    const shouldReduceMotion = useReducedMotion();
    if (shouldReduceMotion) return <div className={className}>{children}</div>;

    return (
        <motion.div variants={staggerItemVariants} className={className}>
            {children}
        </motion.div>
    );
}

export function NumberTicker({ value, className = "", prefix = "", suffix = "", isFormatCurrency = false }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "0px" });
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        if (isInView && !shouldReduceMotion) {
            let start = 0;
            const duration = 1500;
            const end = value;
            // if value is negative or complex, jump to it directly for safety
            if (typeof value !== 'number') { setCount(value); return; }

            let startTime = null;
            const step = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                // Easing out cubic
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                setCount(start + (end - start) * easeProgress);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setCount(end);
                }
            };
            window.requestAnimationFrame(step);
        } else if (shouldReduceMotion) {
            setCount(value);
        }
    }, [isInView, value, shouldReduceMotion]);

    // Format safely depending on value type
    let formatted = count;
    if (typeof value === 'number') {
        if (isFormatCurrency) {
            formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(count);
            if (count > 0) formatted = "+" + formatted; // Match formatSigned
        } else if (Number.isInteger(value)) {
            formatted = Math.round(count);
        } else {
            formatted = count.toFixed(2);
        }
    }

    return (
        <span ref={ref} className={className}>
            {prefix}{shouldReduceMotion ? value : formatted}{suffix}
        </span>
    );
}
