import GccCalculatorClient from "./GccCalculatorClient";

export const metadata = {
  title: "GCC Business Case Calculator",
  description:
    "Model the full cost of setting up a Global Capability Centre in India: entity setup, hiring ramp, parallel running, attrition, wage inflation and real estate on both sides, and see when it pays back.",
  alternates: {
    canonical: "https://anarock.com/gcc-calculator",
  },
};

export default function GccCalculatorPage() {
  return <GccCalculatorClient />;
}