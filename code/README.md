# StatLab notebooks

Seventeen Jupyter notebooks, one per chapter of the [StatLab website](https://khh-aka-lucifer.github.io/statLab/),
teaching the same statistics in Python against real data.

The website builds intuition. You drag a point and the line follows. These notebooks do the other
half: they show you how to get those answers yourself, from data nobody tidied up for you, with the
code visible the whole way. Use both. A student who has only used the sliders cannot analyse
anything, and a student who has only run the code often cannot say what the numbers mean.

## Getting started

You need Python 3.10 or later and four packages.

```sh
pip install numpy pandas matplotlib scipy jupyterlab
jupyter lab
```

Then open `ch1-sampling-and-data.ipynb` and run the first cell. The notebooks find the data whether
you launch Jupyter inside `code/` or at the repository root.

Versions used to build these: Python 3.13, pandas 3.0, numpy 2.4, matplotlib 3.11, scipy 1.17.
Anything recent should work. Two calls need matplotlib 3.10 or later, `boxplot(orientation=...)` and
`boxplot(tick_labels=...)`.

## How the notebooks work

Every chapter follows the same shape.

Read a short explanation, run the worked cell under it, then do the **Your turn** cell yourself. The
worked cells ship with their output visible, so you can read a notebook on GitHub without running
anything, and you can check your own answers against what the text says happened. The Your turn cells
are deliberately blank and deliberately incomplete. There is no answer key. Check yourself by
computing the same thing a second way, which is what a statistician does anyway.

Each chapter ends with five exercises that are harder than the in-line ones and mostly open-ended.
Several of them ask you to break something on purpose, because a method's failure mode teaches more
than its success.

## The chapters

Core concepts, in the order they build on each other.

| | Notebook | Data | The idea |
|---|---|---|---|
| 1 | `ch1-sampling-and-data.ipynb` | penguins | Bias does not shrink when the sample grows. Variance does. |
| 2 | `ch2-descriptive-statistics.ipynb` | Seattle weather | Shape first. A mean of 3 mm and a median of 0 mm are both true. |
| 3 | `ch3-probability-topics.ipynb` | Titanic | Conditioning turns 38 % into 74 % or 19 %. |
| 4 | `ch4-discrete-random-variables.ipynb` | Titanic, weather | The expected value need not be attainable, and real counts often refuse Poisson. |
| 5 | `ch5-continuous-random-variables.ipynb` | Seattle weather | Probability is area. Waiting for rain is nearly memoryless. |
| 6 | `ch6-normal-distribution.ipynb` | penguins | A lumpy histogram is usually two groups in a trench coat. |
| 7 | `ch7-central-limit-theorem.ipynb` | Seattle weather | Averages of very skewed rainfall go normal anyway. |
| 8 | `ch8-confidence-intervals.ipynb` | penguins, Titanic | 95 % is a promise about the procedure, not about your interval. |
| 9 | `ch9-hypothesis-testing.ipynb` | penguins | When nothing is happening, p-values are flat, and 5 % still shout. |
| 10 | `ch10-two-sample-tests.ipynb` | penguins, Titanic, gapminder | Pairing doubled the t statistic with no extra data. |
| 11 | `ch11-chi-square.ipynb` | weather, Titanic | Includes an honest non-result, which textbooks rarely show. |
| 12 | `ch12-linear-regression.ipynb` | gapminder | A line will extrapolate to nonsense without complaining. |
| 13 | `ch13-anova.ipynb` | penguins | Three t-tests raise the false-alarm rate to 11 %. One ANOVA does not. |

Advanced concepts, each branching off the core chapter it needs.

| | Notebook | Data | The idea |
|---|---|---|---|
| 14 | `ch14-counting.ipynb` | penguins, Titanic | There are about 10^45 possible samples of 30 penguins. |
| 15 | `ch15-bayesian-inference.ipynb` | Titanic | A 99 % accurate test for a 1 % disease still leaves you probably healthy. |
| 16 | `ch16-resampling.ipynb` | penguins, Titanic | An interval for a median, where no formula exists. |
| 17 | `ch17-beyond-one-variable.ipynb` | Berkeley, cars | The Berkeley admissions gap changes sign once you add department. |

## The data

Six real datasets live in `data/`, all openly licensed and small enough to keep in the repository, so
the notebooks work offline and keep working. See [`data/SOURCES.md`](data/SOURCES.md) for the
provenance and licence of each, and for how to bring in a Kaggle dataset of your own.

The data has not been cleaned for you. Penguins are missing two weights and eleven sexes, Titanic is
missing 177 ages, and the cars file is missing six horsepower readings. The notebooks say so and deal
with it in the open, because deciding what to do about a hole is part of the analysis rather than
something that happens before it.

### Rebuilding the data

```
penguins.csv         https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv
titanic.csv          https://raw.githubusercontent.com/mwaskom/seaborn-data/master/titanic.csv
cars.csv             https://raw.githubusercontent.com/mwaskom/seaborn-data/master/mpg.csv
seattle-weather.csv  https://raw.githubusercontent.com/vega/vega-datasets/main/data/seattle-weather.csv
gapminder.csv        https://raw.githubusercontent.com/plotly/datasets/master/gapminder_with_codes.csv
```

`berkeley-admissions.csv` was typed from the figures published in Bickel, Hammel and O'Connell,
*Science* 187 (1975), pages 398 to 404.

## `images/`

Empty, and there for you. `plt.savefig("images/my-chart.png")` when you want to keep a figure for a
report or a slide.

## For whoever teaches with this

The charts use the website's colour tokens, set in the first cell of every notebook, so a figure a
student makes here looks like the demo they saw there. Change the `C` dictionary in that cell and
everything downstream follows.

Notebooks are standalone. Chapter 9 does not need Chapter 8 to have been run, so you can assign them
in any order, and a student who misses a week can still do the next one. The cost is a repeated
setup cell, which is worth paying.

Every worked cell was executed before being committed, and the repository is checked so that no
notebook contains an error, a warning, an unrun worked cell, or a Your turn cell that accidentally
shipped its answer.

---

*StatLab, by Dr. Sein Minn and Kaung Hein Htet. Code MIT, text CC BY 4.0.
Follows OpenStax [Introductory Statistics](https://openstax.org) (Illowsky & Dean, CC BY 4.0).*
