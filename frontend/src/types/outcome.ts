// Curriculum outcomes that questions can be tagged with

export interface Outcome {
  code: string
  description: string
}

export interface OutcomeGroup {
  subject: string
  course_level: string
  outcomes: Outcome[]
}

// Known outcome groups — extend as needed
export const OUTCOME_GROUPS: OutcomeGroup[] = [
  {
    subject: "Mathematics Extension 2",
    course_level: "extension_2",
    outcomes: [
      { code: "ME12-1", description: "Applies techniques involving proof or calculus to model and solve problems" },
      { code: "ME12-2", description: "Applies concepts and techniques of complex numbers to prove results, model and solve problems" },
      { code: "ME12-3", description: "Applies advanced concepts and techniques in simplifying expressions involving compound angles and solving trigonometric equations" },
      { code: "ME12-4", description: "Uses calculus in the solution of applied problems, including differential equations and volumes of solids of revolution" },
      { code: "ME12-5", description: "Applies techniques of integration to structured and unstructured problems" },
      { code: "ME12-6", description: "Chooses and uses appropriate technology to solve problems in a range of contexts" },
      { code: "ME12-7", description: "Evaluates and justifies conclusions, communicating a position clearly in appropriate mathematical forms" },
    ],
  },
  {
    subject: "Mathematics Extension 1",
    course_level: "extension_1",
    outcomes: [
      { code: "ME11-1", description: "Uses algebraic and graphical concepts in the modelling and solving of problems involving functions and their inverses" },
      { code: "ME11-2", description: "Manipulates algebraic expressions and graphical functions to solve problems" },
      { code: "ME11-3", description: "Applies concepts and techniques of inverse trigonometric functions and simplifying expressions involving compound angles" },
      { code: "ME11-4", description: "Applies understanding of the concept of a derivative in the solution of problems, including rates of change, exponential growth and decay and related rates of change" },
      { code: "ME11-5", description: "Uses concepts of permutations and combinations to solve problems in counting and probability" },
      { code: "ME11-6", description: "Uses appropriate technology to investigate, organise and interpret information to solve problems in a range of contexts" },
      { code: "ME11-7", description: "Communicates making comprehensive use of mathematical language, notation, diagrams and graphs" },
      { code: "ME12-1", description: "Applies techniques involving proof or calculus to model and solve problems" },
      { code: "ME12-2", description: "Uses detailed knowledge of the relationships between algebraic, graphical and numerical representations of problems to solve them" },
      { code: "ME12-3", description: "Uses calculus in the solution of applied problems, including differential equations and volumes of solids of revolution" },
      { code: "ME12-4", description: "Uses the relationship between numerical, graphical and analytical representations of problems to solve them" },
      { code: "ME12-5", description: "Chooses and uses appropriate technology to solve problems in a range of contexts" },
      { code: "ME12-6", description: "Evaluates and justifies conclusions, communicating a position clearly in appropriate mathematical forms" },
    ],
  },
  {
    subject: "Mathematics Advanced",
    course_level: "advanced",
    outcomes: [
      { code: "MA11-1", description: "Uses algebraic and graphical techniques to solve, where appropriate, parsing and complex problems" },
      { code: "MA11-2", description: "Uses the concepts of functions and relations to model, analyse and solve practical problems" },
      { code: "MA11-3", description: "Uses the concepts and techniques of trigonometry in the solution of equations and problems involving geometric shapes" },
      { code: "MA11-4", description: "Uses the concepts and techniques of periodic functions in the solutions of trigonometric equations or proof of trigonometric identities" },
      { code: "MA11-5", description: "Interprets the meaning of the derivative, determines the derivative of functions and applies these to solve simple practical problems" },
      { code: "MA11-6", description: "Uses appropriate technology to investigate, organise and interpret information to solve problems in a range of contexts" },
      { code: "MA11-7", description: "Communicates making comprehensive use of mathematical language, notation, diagrams and graphs" },
      { code: "MA12-1", description: "Uses detailed knowledge of the relationships between algebraic, graphical and numerical representations to solve problems" },
      { code: "MA12-2", description: "Models and solves problems and makes informed decisions about financial situations using mathematical reasoning and techniques" },
      { code: "MA12-3", description: "Applies calculus techniques to model and solve problems" },
      { code: "MA12-4", description: "Applies the concepts and techniques of arithmetic and geometric sequences and series in the solution of problems" },
      { code: "MA12-5", description: "Applies the concepts and techniques of differentiation and integration to the solution of problems" },
      { code: "MA12-6", description: "Uses appropriate technology to investigate, organise and interpret information to solve problems in a range of contexts" },
      { code: "MA12-7", description: "Evaluates and justifies conclusions, communicating a position clearly in appropriate mathematical forms" },
    ],
  },
  {
    subject: "Mathematics Standard 2",
    course_level: "standard",
    outcomes: [
      { code: "MS11-1", description: "Uses algebraic and graphical techniques to compare alternative solutions to contextual problems with appropriate calculations" },
      { code: "MS11-2", description: "Represents information in symbolic, graphical and tabular form" },
      { code: "MS11-3", description: "Solves problems involving quantity measurement, including accuracy and the choice of relevant units" },
      { code: "MS11-4", description: "Performs calculations in relation to two-dimensional and three-dimensional figures" },
      { code: "MS11-5", description: "Models relevant financial situations using appropriate tools" },
      { code: "MS11-6", description: "Uses appropriate technology to investigate, organise and interpret information to solve problems in a range of contexts" },
      { code: "MS11-7", description: "Communicates making comprehensive use of mathematical language, notation, diagrams and graphs" },
      { code: "MS12-1", description: "Uses detailed knowledge of the relationships between algebraic, graphical and numerical representations to solve practical problems" },
      { code: "MS12-2", description: "Solves problems using networks, algebraic and graphical techniques" },
      { code: "MS12-3", description: "Interprets statistical information to make informed decisions" },
      { code: "MS12-4", description: "Uses statistics and probability to solve problems in a range of contexts" },
      { code: "MS12-5", description: "Makes informed financial decisions using appropriate calculations" },
      { code: "MS12-6", description: "Uses appropriate technology to investigate, organise and interpret information to solve problems in a range of contexts" },
      { code: "MS12-7", description: "Evaluates and justifies conclusions, communicating a position clearly in appropriate mathematical forms" },
    ],
  },
]

/** Flat lookup of all outcomes by code */
export const ALL_OUTCOMES: Map<string, Outcome> = new Map(
  OUTCOME_GROUPS.flatMap((g) => g.outcomes.map((o) => [o.code, o]))
)

/** Get outcomes for a specific course level */
export function getOutcomesForCourseLevel(courseLevel: string): Outcome[] {
  const group = OUTCOME_GROUPS.find((g) => g.course_level === courseLevel)
  return group?.outcomes ?? []
}
