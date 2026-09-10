/*
  chapters.js — the single source of truth for chapter order, slugs, titles,
  blurbs, and section titles (mirrors docs/SYLLABUS.md v3; slugs are the
  folder names under /chapters/). Exposes one global, `chapters` (HANDBOOK H1).
  `phase` is the PLAN A1 build phase that delivers each chapter/section.
  `tier` is "core" (the 13-chapter main trail) or "advanced" (a side branch), and
  `branchOf` is the chapter number an advanced chapter hangs off — together they
  define the learning-journey path on the landing page, so the path is never
  hard-coded in HTML (D-040). `part` is the older book/beyond split and is kept
  as data; the user-facing names are Core Concepts and Advanced Concepts (D-043).
  tools/check-content.mjs verifies every chapter page against this file.
*/
window.chapters = [
  {
    "number": 1,
    "slug": "sampling-and-data",
    "tier": "core",
    "branchOf": null,
    "title": "Sampling and Data",
    "part": "A",
    "book": "Ch 1",
    "phase": 6,
    "blurb": "How we get data, and why the way we sample decides what we can conclude.",
    "sections": [
      {
        "id": "section-1",
        "number": "1.1",
        "title": "Population and sample",
        "demo": "sampling-and-data__population-sample",
        "phase": 6
      },
      {
        "id": "section-2",
        "number": "1.2",
        "title": "Sampling methods and bias",
        "demo": "sampling-and-data__sampling-methods",
        "phase": 6
      },
      {
        "id": "section-3",
        "number": "1.3",
        "title": "Variation in samples",
        "demo": "sampling-and-data__sample-variation",
        "phase": 6
      }
    ]
  },
  {
    "number": 2,
    "slug": "descriptive-statistics",
    "tier": "core",
    "branchOf": null,
    "title": "Descriptive Statistics",
    "part": "A",
    "book": "Ch 2",
    "phase": 7,
    "blurb": "Pictures and numbers that summarize the shape, center, and spread of a data set.",
    "sections": [
      {
        "id": "section-1",
        "number": "2.1",
        "title": "Histograms",
        "demo": "descriptive-statistics__histogram",
        "phase": 7
      },
      {
        "id": "section-2",
        "number": "2.2",
        "title": "Center and location",
        "demo": "descriptive-statistics__center",
        "phase": 7
      },
      {
        "id": "section-3",
        "number": "2.3",
        "title": "Box plots and skewness",
        "demo": "descriptive-statistics__boxplot-skew",
        "phase": 7
      },
      {
        "id": "section-4",
        "number": "2.4",
        "title": "Spread",
        "demo": "descriptive-statistics__spread",
        "phase": 7
      }
    ]
  },
  {
    "number": 3,
    "slug": "probability-topics",
    "tier": "core",
    "branchOf": null,
    "title": "Probability Topics",
    "part": "A",
    "book": "Ch 3",
    "phase": 5,
    "blurb": "Probability as long-run frequency, and the rules for combining events.",
    "sections": [
      {
        "id": "section-1",
        "number": "3.1",
        "title": "Chance and long-run frequency",
        "demo": "probability-topics__coin-flip",
        "phase": 4
      },
      {
        "id": "section-2",
        "number": "3.2",
        "title": "Events, unions, intersections",
        "demo": "probability-topics__events",
        "phase": 5
      },
      {
        "id": "section-3",
        "number": "3.3",
        "title": "Conditional probability and contingency tables",
        "demo": "probability-topics__conditional",
        "phase": 5
      }
    ]
  },
  {
    "number": 4,
    "slug": "discrete-random-variables",
    "tier": "core",
    "branchOf": null,
    "title": "Discrete Random Variables",
    "part": "A",
    "book": "Ch 4",
    "phase": 8,
    "blurb": "Random variables that count things, their expected values, and the named distributions.",
    "sections": [
      {
        "id": "section-1",
        "number": "4.1",
        "title": "Expectation",
        "demo": "discrete-random-variables__expectation",
        "phase": 8
      },
      {
        "id": "section-2",
        "number": "4.2",
        "title": "Variance of a random variable",
        "demo": "discrete-random-variables__rv-variance",
        "phase": 8
      },
      {
        "id": "section-3",
        "number": "4.3",
        "title": "The named discrete distributions",
        "demo": "discrete-random-variables__discrete-distributions",
        "phase": 8
      }
    ]
  },
  {
    "number": 5,
    "slug": "continuous-random-variables",
    "tier": "core",
    "branchOf": null,
    "title": "Continuous Random Variables",
    "part": "A",
    "book": "Ch 5",
    "phase": 9,
    "blurb": "Densities, area as probability, and the exponential model of waiting times.",
    "sections": [
      {
        "id": "section-1",
        "number": "5.1",
        "title": "Density and area",
        "demo": "continuous-random-variables__density-area",
        "phase": 9
      },
      {
        "id": "section-2",
        "number": "5.2",
        "title": "The exponential distribution",
        "demo": "continuous-random-variables__exponential",
        "phase": 9
      }
    ]
  },
  {
    "number": 6,
    "slug": "normal-distribution",
    "tier": "core",
    "branchOf": null,
    "title": "The Normal Distribution",
    "part": "A",
    "book": "Ch 6",
    "phase": 10,
    "blurb": "The bell curve, z-scores, and the 68–95–99.7 rule.",
    "sections": [
      {
        "id": "section-1",
        "number": "6.1",
        "title": "Z-scores",
        "demo": "normal-distribution__z-scores",
        "phase": 10
      },
      {
        "id": "section-2",
        "number": "6.2",
        "title": "Normal areas and the empirical rule",
        "demo": "normal-distribution__normal-areas",
        "phase": 10
      }
    ]
  },
  {
    "number": 7,
    "slug": "central-limit-theorem",
    "tier": "core",
    "branchOf": null,
    "title": "The Central Limit Theorem",
    "part": "A",
    "book": "Ch 7",
    "phase": 11,
    "blurb": "Why averages of almost anything look normal, and how their spread shrinks with n.",
    "sections": [
      {
        "id": "section-1",
        "number": "7.1",
        "title": "CLT for sample means",
        "demo": "central-limit-theorem__clt-means",
        "phase": 11
      },
      {
        "id": "section-2",
        "number": "7.2",
        "title": "The standard error",
        "demo": "central-limit-theorem__standard-error",
        "phase": 11
      },
      {
        "id": "section-3",
        "number": "7.3",
        "title": "CLT for sums",
        "demo": "central-limit-theorem__clt-sums",
        "phase": 11
      }
    ]
  },
  {
    "number": 8,
    "slug": "confidence-intervals",
    "tier": "core",
    "branchOf": null,
    "title": "Confidence Intervals",
    "part": "A",
    "book": "Ch 8",
    "phase": 12,
    "blurb": "What a 95% interval promises, and how to build one for a mean or a proportion.",
    "sections": [
      {
        "id": "section-1",
        "number": "8.1",
        "title": "What “95% confident” means",
        "demo": "confidence-intervals__ci-meaning",
        "phase": 12
      },
      {
        "id": "section-2",
        "number": "8.2",
        "title": "The t distribution",
        "demo": "confidence-intervals__t-distribution",
        "phase": 12
      },
      {
        "id": "section-3",
        "number": "8.3",
        "title": "Intervals for proportions",
        "demo": "confidence-intervals__proportion-ci",
        "phase": 12
      }
    ]
  },
  {
    "number": 9,
    "slug": "hypothesis-testing",
    "tier": "core",
    "branchOf": null,
    "title": "Hypothesis Testing (One Sample)",
    "part": "A",
    "book": "Ch 9",
    "phase": 13,
    "blurb": "Null hypotheses, error types, and what a p-value really measures.",
    "sections": [
      {
        "id": "section-1",
        "number": "9.1",
        "title": "Hypotheses and error types",
        "demo": "hypothesis-testing__error-types",
        "phase": 13
      },
      {
        "id": "section-2",
        "number": "9.2",
        "title": "The p-value",
        "demo": "hypothesis-testing__p-value",
        "phase": 13
      },
      {
        "id": "section-3",
        "number": "9.3",
        "title": "The full test, honestly run",
        "demo": "hypothesis-testing__full-test",
        "phase": 13
      }
    ]
  },
  {
    "number": 10,
    "slug": "two-sample-tests",
    "tier": "core",
    "branchOf": null,
    "title": "Hypothesis Testing (Two Samples)",
    "part": "A",
    "book": "Ch 10",
    "phase": 15,
    "blurb": "Comparing two means or two proportions, and why pairing helps.",
    "sections": [
      {
        "id": "section-1",
        "number": "10.1",
        "title": "Comparing two means",
        "demo": "two-sample-tests__two-means",
        "phase": 15
      },
      {
        "id": "section-2",
        "number": "10.2",
        "title": "Comparing two proportions",
        "demo": "two-sample-tests__two-proportions",
        "phase": 15
      },
      {
        "id": "section-3",
        "number": "10.3",
        "title": "Paired samples",
        "demo": "two-sample-tests__paired",
        "phase": 15
      }
    ]
  },
  {
    "number": 11,
    "slug": "chi-square",
    "tier": "core",
    "branchOf": null,
    "title": "The Chi-Square Distribution",
    "part": "A",
    "book": "Ch 11",
    "phase": 16,
    "blurb": "Testing whether counts fit a claim, and whether two variables are independent.",
    "sections": [
      {
        "id": "section-1",
        "number": "11.1",
        "title": "Goodness of fit",
        "demo": "chi-square__goodness-of-fit",
        "phase": 16
      },
      {
        "id": "section-2",
        "number": "11.2",
        "title": "Test of independence",
        "demo": "chi-square__independence",
        "phase": 16
      }
    ]
  },
  {
    "number": 12,
    "slug": "linear-regression",
    "tier": "core",
    "branchOf": null,
    "title": "Linear Regression and Correlation",
    "part": "A",
    "book": "Ch 12",
    "phase": 17,
    "blurb": "Fitting a line, reading r, and knowing when prediction is safe.",
    "sections": [
      {
        "id": "section-1",
        "number": "12.1",
        "title": "Least squares",
        "demo": "linear-regression__least-squares",
        "phase": 17
      },
      {
        "id": "section-2",
        "number": "12.2",
        "title": "Correlation",
        "demo": "linear-regression__correlation",
        "phase": 17
      },
      {
        "id": "section-3",
        "number": "12.3",
        "title": "The line is an estimate",
        "demo": "linear-regression__line-estimate",
        "phase": 17
      },
      {
        "id": "section-4",
        "number": "12.4",
        "title": "Prediction and outliers",
        "demo": "linear-regression__prediction-outliers",
        "phase": 17
      }
    ]
  },
  {
    "number": 13,
    "slug": "anova",
    "tier": "core",
    "branchOf": null,
    "title": "F Distribution and One-Way ANOVA",
    "part": "A",
    "book": "Ch 13",
    "phase": 18,
    "blurb": "Comparing several group means at once by weighing between-group against within-group variation.",
    "sections": [
      {
        "id": "section-1",
        "number": "13.1",
        "title": "The idea of ANOVA",
        "demo": "anova__anova-idea",
        "phase": 18
      },
      {
        "id": "section-2",
        "number": "13.2",
        "title": "The F distribution and the decision",
        "demo": "anova__f-distribution",
        "phase": 18
      }
    ]
  },
  {
    "number": 14,
    "slug": "counting",
    "tier": "advanced",
    "branchOf": 3,
    "title": "Counting",
    "part": "B",
    "book": null,
    "phase": 20,
    "blurb": "Multiplying choices, and telling permutations from combinations.",
    "sections": [
      {
        "id": "section-1",
        "number": "14.1",
        "title": "The multiplication rule",
        "demo": "counting__multiplication-rule",
        "phase": 20
      },
      {
        "id": "section-2",
        "number": "14.2",
        "title": "Permutations and combinations",
        "demo": "counting__permutations-combinations",
        "phase": 20
      }
    ]
  },
  {
    "number": 15,
    "slug": "bayesian-inference",
    "tier": "advanced",
    "branchOf": 3,
    "title": "Bayesian Inference",
    "part": "B",
    "book": null,
    "phase": 21,
    "blurb": "Updating belief with data, through Bayes’ theorem, likelihood, and posteriors.",
    "sections": [
      {
        "id": "section-1",
        "number": "15.1",
        "title": "Bayes’ theorem",
        "demo": "bayesian-inference__bayes-theorem",
        "phase": 21
      },
      {
        "id": "section-2",
        "number": "15.2",
        "title": "Likelihood",
        "demo": "bayesian-inference__likelihood",
        "phase": 21
      },
      {
        "id": "section-3",
        "number": "15.3",
        "title": "Prior to posterior",
        "demo": "bayesian-inference__prior-posterior",
        "phase": 21
      }
    ]
  },
  {
    "number": 16,
    "slug": "resampling",
    "tier": "advanced",
    "branchOf": 9,
    "title": "Resampling",
    "part": "B",
    "book": null,
    "phase": 22,
    "blurb": "Bootstrap and permutation methods for when formulas run out.",
    "sections": [
      {
        "id": "section-1",
        "number": "16.1",
        "title": "The bootstrap",
        "demo": "resampling__bootstrap",
        "phase": 22
      },
      {
        "id": "section-2",
        "number": "16.2",
        "title": "Permutation tests",
        "demo": "resampling__permutation-test",
        "phase": 22
      }
    ]
  },
  {
    "number": 17,
    "slug": "beyond-one-variable",
    "tier": "advanced",
    "branchOf": 12,
    "title": "Beyond One Variable",
    "part": "B",
    "book": null,
    "phase": 23,
    "blurb": "How a third variable can reverse a conclusion, and what a coefficient means with two predictors.",
    "sections": [
      {
        "id": "section-1",
        "number": "17.1",
        "title": "Simpson’s paradox",
        "demo": "beyond-one-variable__simpsons-paradox",
        "phase": 23
      },
      {
        "id": "section-2",
        "number": "17.2",
        "title": "Two predictors",
        "demo": "beyond-one-variable__two-predictors",
        "phase": 23
      }
    ]
  }
];
