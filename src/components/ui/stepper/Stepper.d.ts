import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, JSX, ReactNode } from 'react';

// Tipos del Stepper de React Bits (Stepper.jsx se usa tal cual viene del sitio).
export interface StepProps { children?: ReactNode; title?: ReactNode; description?: ReactNode; icon?: ReactNode }
export function Step(props: StepProps): JSX.Element;

export interface StepIndicatorArgs { step: number; currentStep: number; onStepClick: (step: number) => void }

export interface StepperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  children?: ReactNode;
  step?: number;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  indicator?: 'numbers' | 'dots' | 'bars';
  orientation?: 'horizontal' | 'vertical';
  transition?: 'slide' | 'fade' | 'none';
  linear?: boolean;
  disableStepIndicators?: boolean;
  renderStepIndicator?: (args: StepIndicatorArgs) => ReactNode;
  showFooter?: boolean;
  backButtonText?: ReactNode;
  nextButtonText?: ReactNode;
  completeButtonText?: ReactNode;
  backButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  completedContent?: ReactNode;
  theme?: 'dark' | 'light';
  accentColor?: string;
  frame?: boolean;
  radius?: number;
  width?: number | string;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  style?: CSSProperties & Record<`--${string}`, string>;
}
export default function Stepper(props: StepperProps): JSX.Element;
