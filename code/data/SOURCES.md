# Where this data comes from

Six real datasets, all small enough to keep in the repository so the notebooks work offline
and keep working after any website changes its links. Every one is openly licensed and may be
redistributed. Nothing here was invented or simulated. Where a file has missing values or odd
rows, that is the real data, and the notebooks say so rather than quietly cleaning it away.

| File | Rows | What it is | Source | Licence |
|---|---|---|---|---|
| `penguins.csv` | 344 | Body measurements of Adelie, Chinstrap and Gentoo penguins at Palmer Station, Antarctica, 2007–2009 | Gorman, Williams & Fraser (2014), *PLoS ONE* 9(3):e90081, via the `palmerpenguins` package | CC0 1.0 (public domain) |
| `titanic.csv` | 891 | Passengers of the RMS Titanic, with age, class, fare, sex and survival | Encyclopedia Titanica passenger records, via the Vanderbilt biostatistics dataset | Public domain historical record |
| `cars.csv` | 398 | Fuel economy, weight, horsepower and origin of 1970s–80s cars | Auto MPG, UCI Machine Learning Repository (Quinlan 1993) | CC BY 4.0 |
| `seattle-weather.csv` | 1461 | Daily precipitation, temperature and wind in Seattle, 2012–2015 | NOAA daily records, via `vega-datasets` | BSD-3-Clause |
| `gapminder.csv` | 1704 | Life expectancy, population and GDP per capita for 142 countries, every 5 years from 1952 to 2007 | Gapminder Foundation | CC BY 4.0 |
| `berkeley-admissions.csv` | 12 | Graduate admissions at UC Berkeley in autumn 1973, by department and gender | Bickel, Hammel & O'Connell (1975), *Science* 187:398–404 | Public domain (published figures) |

## A note on Kaggle

Kaggle hosts a lot of good teaching data, and you are welcome to bring some in. Two things
made it the wrong default here.

Downloading from Kaggle needs an account, an API token and per-dataset terms acceptance, so a
student cannot just clone the repository and run. And Kaggle licences vary from CC0 to "view
only", which means many datasets cannot legally be committed alongside the notebooks. The six
files above avoid both problems, and several of them (Titanic, Auto MPG) are the same datasets
Kaggle hosts anyway.

To add a Kaggle dataset yourself:

```sh
pip install kaggle
# put your kaggle.json in ~/.kaggle/, then
kaggle datasets download -d <owner>/<dataset> -p code/data --unzip
```

Check the dataset's licence before committing the file, and add a row to the table above.

## Rebuilding these files

Each file was fetched once and saved as-is apart from normalised line endings. The URLs are in
`code/README.md` under "Rebuilding the data".
