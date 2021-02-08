## Functions.R
library(tidyverse)
# Preprocessing


# Plotting
binomial_smooth = function(link='probit', ...){
  geom_smooth(method='glm', method.args = list(family=binomial(link=link)), ...)
}
